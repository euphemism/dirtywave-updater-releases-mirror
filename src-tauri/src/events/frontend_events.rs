use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

use serde::Deserialize;
use serde::{de::DeserializeOwned, Serialize};
use tauri::{AppHandle, Event as TauriEvent, Listener, Manager};

use crate::firmware::ConnectedDevice;

pub trait FrontendEvent {
    type Payload: DeserializeOwned;

    fn listen<F>(app_handle: &AppHandle, handler: F)
    where
        F: FnMut(TauriEvent, Self::Payload) + Send + 'static;
}

macro_rules! impl_event {
    ($event_struct:ident, $payload_type:ty, $event_name:expr) => {
        impl FrontendEvent for $event_struct {
            type Payload = $payload_type;

            fn listen<F>(app_handle: &AppHandle, handler: F)
            where
                F: FnMut(TauriEvent, Self::Payload) + Send + 'static,
            {
                let handler = Arc::new(Mutex::new(handler));

                let window = app_handle.get_webview_window("main").unwrap();

                let handler_clone = Arc::clone(&handler);

                window.listen($event_name, move |event| {
                    let payload_str = if !event.payload().is_empty() {
                        event.payload()
                    } else {
                        "null"
                    };

                    let result = serde_json::from_str::<Self::Payload>(payload_str);

                    match result {
                        Ok(payload) => {
                            if let Ok(mut handler) = handler_clone.lock() {
                                handler(event.clone(), payload);
                            } else {
                                log::info!("Failed to lock handler mutex");
                            }
                        }
                        Err(err) => {
                            log::info!(
                                "Failed to deserialize payload for event '{}': {}",
                                $event_name,
                                err
                            );

                            // TODO: Optionally handle the error further
                        }
                    }
                });
            }
        }
    };
}

pub struct VersionSelected;

#[derive(Deserialize, Debug)]
pub struct VersionSelectedPayload {
    pub path: String,
    pub version: Option<String>,
}

impl_event!(VersionSelected, VersionSelectedPayload, "version-selected");

pub struct FrontendLoaded;

impl_event!(FrontendLoaded, (), "frontend-loaded");

pub struct StartFirmwareDownload;

#[derive(Deserialize, Debug)]
pub struct StartFirmwareDownloadPayload {
    pub device: String,
}

impl_event!(
    StartFirmwareDownload,
    StartFirmwareDownloadPayload,
    "start-firmware-download"
);

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum DownloadState {
    Stopped,
    Starting,
    Downloading,
    Complete,
    Error,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct DownloadStatus {
    pub bytes_downloaded: u32,
    pub log: Option<String>,
    pub size: u64,
    pub state: DownloadState,
}

pub struct SerialWatchUpdate;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SerialWatchUpdatePayload {
    pub devices: HashMap<String, ConnectedDevice>,
}

impl_event!(
    SerialWatchUpdate,
    SerialWatchUpdatePayload,
    "serial-watch-update"
);

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum UploadState {
    Stopped,
    Starting,
    Uploading,
    Finalizing,
    Error,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum FlashingCycle {
    Downloading,
    Uploading,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct UploadStatus {
    pub log: Option<String>,
    pub state: UploadState,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum FlashingStatus {
    Downloading(DownloadStatus),
    Uploading(UploadStatus),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct FlashingStatusPayload {
    pub cycle: FlashingCycle,
    pub status: FlashingStatus,
}
