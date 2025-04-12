use std::future::Future;
use std::pin::Pin;

use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::events::frontend_events::SerialWatchUpdatePayload;
use crate::firmware::{determine_device_type, ConnectedDevice, DeviceType};
use crate::state::{devices_digest, AppState};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct TyCmdListEntry {
    pub action: String,
    pub capabilities: Vec<String>,
    pub description: String,
    pub interfaces: Vec<Vec<String>>,
    pub location: String,
    pub model: String,
    pub serial: String,
    pub tag: String,
}

type BoxedFuture<'a> = Pin<Box<dyn Future<Output = Option<()>> + Send + 'a>>;

fn process_tycmd_list_entry(
    event: CommandEvent,
    app_handle: AppHandle,
    buffer: &mut String,
) -> BoxedFuture<'_> {
    Box::pin(async move {
        if let CommandEvent::Stdout(line) = event {
            let output = match String::from_utf8(line) {
                Ok(output) => output.trim().to_owned(),
                Err(_) => return None,
            };

            buffer.push_str(&output);

            log::info!("HERE:Buffer is currently |{}|", buffer.as_str());

            // Try to parse complete JSON objects from buffer
            let mut entries: Vec<TyCmdListEntry> = Vec::new();
            let mut processed_bytes = 0;

            // Handle multiple JSON objects that might be concatenated
            let buffer_str = buffer.as_str();
            let mut remaining_buffer = buffer_str;

            while !remaining_buffer.is_empty() {
                // Find the end of the first complete JSON object
                let mut brace_count = 0;
                let mut end_pos = 0;
                let mut found_complete = false;

                for (i, ch) in remaining_buffer.char_indices() {
                    match ch {
                        '{' => brace_count += 1,
                        '}' => {
                            brace_count -= 1;
                            if brace_count == 0 {
                                end_pos = i + 1;
                                found_complete = true;
                                break;
                            }
                        }
                        _ => {}
                    }
                }

                if !found_complete {
                    // Incomplete JSON, wait for more data
                    break;
                }

                let json_str = &remaining_buffer[..end_pos];
                log::info!("Attempting to parse JSON: {}", json_str);

                match serde_json::from_str::<TyCmdListEntry>(json_str) {
                    Ok(entry) => {
                        log::info!("matched: {:?}", entry);
                        entries.push(entry);
                        processed_bytes += json_str.len();
                        remaining_buffer = remaining_buffer[end_pos..].trim_start();
                        processed_bytes += end_pos - json_str.len(); // Account for trimmed whitespace
                    }
                    Err(e) => {
                        log::info!("Failed to parse JSON: {}", e);
                        // Skip this malformed JSON and try the rest
                        remaining_buffer = &remaining_buffer[1..];
                        processed_bytes += 1;
                    }
                }
            }

            // Update buffer with any remaining incomplete JSON
            buffer.drain(..processed_bytes);

            // Process the parsed entries (no need for buffer.clear() at the end)
            for entry in entries {
                let device_type = determine_device_type(&entry);

                log::info!("Device type is {:?}", device_type);

                // I don't want to support headless devices with this tool; This tool is intended to be
                // another incentive for people to purchase M8s over cheap, Chinese handhelds like Anbernic.
                // To clarify: I understand many users of headless/people that combine a Teensy 4.1 with
                // these handhelds are not explicitly trying to avoid giving Tim money for the immense
                // labor and sacrifice that has gone into the M8, but.
                if device_type == DeviceType::HEADLESS || device_type == DeviceType::UNKNOWN {
                    log::info!("Device type is headless or unknown, skipping serial device");

                    continue;
                }

                let state = app_handle.state::<AppState>();

                let mut state_guard = state.lock().await;

                let action_history = vec![entry.action.to_string()];

                let mut device = ConnectedDevice {
                    action_history,
                    device_type,
                    ty_cmd_info: entry,
                    updated_at: chrono::Utc::now().timestamp_millis(),
                };

                log::info!("Valid device found: {:?}", device);

                match device.ty_cmd_info.action.to_string() {
                    val if val == *"add" => {
                        log::info!("action is add. Inserting into devices map");
                        state_guard
                            .devices
                            .insert(device.ty_cmd_info.tag.to_string(), device);
                    }
                    val if val == *"change" || val == *"miss" => {
                        log::info!("action is change or miss.");

                        if let Some(existing_device) =
                            state_guard.devices.get(&device.ty_cmd_info.tag)
                        {
                            log::info!("existing device is {:?}", existing_device);
                            // Keep a small, bounded action history to avoid unbounded growth
                            let mut history = existing_device.action_history.clone();

                            history.push(device.ty_cmd_info.action.to_string());

                            const MAX_HISTORY: usize = 20;

                            if history.len() > MAX_HISTORY {
                                let overflow = history.len() - MAX_HISTORY;

                                history.drain(0..overflow);
                            }

                            device.action_history = history;

                            state_guard
                                .devices
                                .insert(device.ty_cmd_info.tag.to_string(), device);
                        };
                    }
                    val if val == *"remove" => {
                        log::info!("action is remove. Removing from devices map");

                        state_guard
                            .devices
                            .remove(&device.ty_cmd_info.tag.to_string());
                    }
                    _ => (),
                }

                let digest = devices_digest(&state_guard.devices);

                log::info!("Device digest is {}", digest);

                let should_emit =
                    !matches!(state_guard.last_devices_digest, Some(prev) if prev == digest);

                log::info!("Should emit? {}", should_emit);

                if should_emit {
                    state_guard.last_devices_digest = Some(digest);

                    log::info!("Last devices digest being set to {}", digest);
                    log::info!("Emitting serial-watch-update");

                    let _ = app_handle.emit_to(
                        "main",
                        "serial-watch-update",
                        SerialWatchUpdatePayload {
                            devices: state_guard.devices.clone(),
                        },
                    );
                }
            }
        }
        // if let CommandEvent::Stdout(line) = event {
        //     let output = match String::from_utf8(line) {
        //         Ok(output) => output.trim().to_owned(),
        //         Err(_) => return None,
        //     };

        //     buffer.push_str(&output);

        //     log::info!("HERE:Buffer is currently |{}|", buffer.as_str());

        //     // Split the buffer into individual JSON objects
        //     // Matches }{ and }\n{
        //     let re = Regex::new(r"(?<json_object>\{.*})(?:\n\{|\{)").unwrap();

        //     let mut entries: Vec<TyCmdListEntry> = Vec::new();

        //     log::info!("||Attempting to match against {}||", buffer.as_str());

        //     log::info!(
        //         "Match: {}",
        //         if let Some(mat) = re.find(buffer.as_str()) {
        //             mat.as_str()
        //         } else {
        //             ""
        //         }
        //     );

        //     while let Some(captures) = re.captures(buffer.as_str()) {
        //         log::info!("re.captures returned..something");
        //         log::info!("{:?}", captures);

        //         if let Some(json_object) = captures.name("json_object") {
        //             log::info!("We've matched against {}", json_object.as_str());

        //             match serde_json::from_str::<serde_json::Value>(json_object.as_str()) {
        //                 Ok(json_value) => {
        //                     if let Ok(entry) = serde_json::from_value::<TyCmdListEntry>(json_value)
        //                     {
        //                         entries.push(entry);

        //                         buffer.drain(json_object.range());
        //                     }
        //                 }
        //                 Err(e) => {
        //                     log::info!("Failed to parse JSON: {}", e);
        //                     return None;
        //                 }
        //             }
        //         } else {
        //             log::info!("The regex did not match. RIP.");
        //         }
        //     }

        //     // // Try to parse the remaining buffer as a single JSON object
        //     // if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(buffer.as_str()) {
        //     //     if let Ok(entry) = serde_json::from_value::<TyCmdListEntry>(json_value) {
        //     //         entries.push(entry);
        //     //     }
        //     //     buffer.clear();
        //     // }

        //     let json_value: serde_json::Value = match serde_json::from_str(buffer.as_str()) {
        //         Ok(value) => value,
        //         Err(e) => {
        //             log::info!("Failed to parse JSON: {}", e);

        //             return None;
        //         }
        //     };

        //     if json_value.is_array() {
        //         match serde_json::from_value(json_value) {
        //             Ok(mut data) => entries.append(&mut data),
        //             Err(e) => {
        //                 log::info!("Failed to parse JSON: {}", e);

        //                 return None;
        //             }
        //         }
        //     } else {
        //         match serde_json::from_value(json_value) {
        //             Ok(data) => entries.push(data),
        //             Err(e) => {
        //                 log::info!("Failed to parse JSON: {}", e);

        //                 return None;
        //             }
        //         }
        //     }

        //     // let entries: Vec<TyCmdListEntry> = if json_value.is_array() {
        //     //     match serde_json::from_value(json_value) {
        //     //         Ok(data) => data,
        //     //         Err(e) => {
        //     //             log::info!("Failed to parse JSON: {}", e);

        //     //             return None;
        //     //         }
        //     //     }
        //     // } else {
        //     //     match serde_json::from_value(json_value) {
        //     //         Ok(data) => vec![data],
        //     //         Err(e) => {
        //     //             log::info!("Failed to parse JSON: {}", e);

        //     //             return None;
        //     //         }
        //     //     }
        //     // };

        //     for entry in entries {
        //         let device_type = determine_device_type(&entry);

        //         // I don't want to support headless devices with this tool; This tool is intended to be
        //         // another incentive for people to purchase M8s over cheap, Chinese handhelds like Anbernic.
        //         // To clarify: I understand many users of headless/people that combine a Teensy 4.1 with
        //         // these handhelds are not explicitly trying to avoid giving Tim money for the immense
        //         // labor and sacrifice that has gone into the M8, but.
        //         if device_type == DeviceType::HEADLESS || device_type == DeviceType::UNKNOWN {
        //             continue;
        //         }

        //         let state = app_handle.state::<AppState>();

        //         let mut state_guard = state.lock().await;

        //         let action_history = vec![entry.action.to_string()];

        //         let mut device = ConnectedDevice {
        //             action_history,
        //             device_type,
        //             ty_cmd_info: entry,
        //             updated_at: chrono::Utc::now().timestamp_millis(),
        //         };

        //         match device.ty_cmd_info.action.to_string() {
        //             val if val == *"add" => {
        //                 state_guard
        //                     .devices
        //                     .insert(device.ty_cmd_info.tag.to_string(), device);
        //             }
        //             val if val == *"change" || val == *"miss" => {
        //                 if let Some(existing_device) =
        //                     state_guard.devices.get(&device.ty_cmd_info.tag)
        //                 {
        //                     // Keep a small, bounded action history to avoid unbounded growth
        //                     let mut history = existing_device.action_history.clone();
        //                     history.push(device.ty_cmd_info.action.to_string());
        //                     const MAX_HISTORY: usize = 20;
        //                     if history.len() > MAX_HISTORY {
        //                         let overflow = history.len() - MAX_HISTORY;
        //                         history.drain(0..overflow);
        //                     }
        //                     device.action_history = history;

        //                     state_guard
        //                         .devices
        //                         .insert(device.ty_cmd_info.tag.to_string(), device);
        //                 };
        //             }
        //             val if val == *"remove" => {
        //                 state_guard
        //                     .devices
        //                     .remove(&device.ty_cmd_info.tag.to_string());
        //             }
        //             _ => (),
        //         }

        //         let digest = devices_digest(&state_guard.devices);
        //         let should_emit = match state_guard.last_devices_digest {
        //             Some(prev) if prev == digest => false,
        //             _ => true,
        //         };
        //         if should_emit {
        //             state_guard.last_devices_digest = Some(digest);
        //             let _ = app_handle.emit_to(
        //                 "main",
        //                 "serial-watch-update",
        //                 SerialWatchUpdatePayload {
        //                     devices: state_guard.devices.clone(),
        //                 },
        //             );
        //         }
        //     }

        //     buffer.clear();
        // }

        // TODO: Handle errors
        // if let CommandEvent::Error(line) = event.clone()
        // if let CommandEvent::Stderr(line) = event.clone()

        Some(())
    })
}

#[derive(PartialEq)]
enum InvokeTyCmd {
    List,
    Watch,
}

#[allow(clippy::type_complexity)]
async fn invoke_tycmd(
    command: InvokeTyCmd,
    callback: fn(event: CommandEvent, app_handle: AppHandle, buffer: &mut String) -> BoxedFuture,
    app_handle: &AppHandle,
) {
    let invoke_app_handle = app_handle.clone();

    let sidecar = invoke_app_handle
        .shell()
        .sidecar("tycmd")
        .unwrap()
        .set_raw_out(true)
        .args(if command == InvokeTyCmd::List {
            vec!["list", "--verbose", "--output", "json"]
        } else {
            vec!["list", "--verbose", "--watch", "--output", "json"]
        });

    // TODO: Handle the failed expectation
    let (mut rx, _child) = sidecar.spawn().expect("Failed to spawn tycmd");

    let mut buffer = String::new();

    while let Some(event) = rx.recv().await {
        let result = callback(event, invoke_app_handle.clone(), &mut buffer).await;

        if command == InvokeTyCmd::List && result == Some(()) {
            break;
        }
    }

    log::info!("Done receiving data from tycmd child process");
}

pub async fn tycmd_list(app_handle: &AppHandle) {
    invoke_tycmd(InvokeTyCmd::List, process_tycmd_list_entry, app_handle).await;
}

pub async fn tycmd_watch(app_handle: &AppHandle) {
    let app_handle = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        invoke_tycmd(InvokeTyCmd::Watch, process_tycmd_list_entry, &app_handle).await;
    });
}
