use std::env;
use std::sync::Arc;

use anyhow::Result;
use events::frontend_events::SerialWatchUpdatePayload;
use firmware::start_firmware_download_handler;
use serial::provider::{DeviceProvider, TycmdProvider};
use tauri::{App, AppHandle, Emitter, Manager};

use crate::{
    events::frontend_events::{self, FrontendEvent},
    state::{devices_digest, AppState, AppStateData},
};

pub mod events;
pub mod firmware;
pub mod serial;
pub mod state;
pub mod updater;

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle();

    log::info!(
        "{}",
        app_handle
            .path()
            .app_config_dir()
            .unwrap()
            .to_str()
            .unwrap()
    );

    app_handle.manage(AppState::new(AppStateData::default()));

    let updater_app_handle = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        log::info!("invoking the updater bit");
        crate::updater::app_updates::update(updater_app_handle.clone())
            .await
            .unwrap();
    });

    firmware::setup_firmware_store(app_handle)?;

    #[cfg(any(windows, target_os = "linux"))]
    {
        use tauri_plugin_deep_link::DeepLinkExt;
        app.deep_link().register_all()?;
    }

    setup_event_listeners(Arc::new(app_handle.clone()));

    Ok(())
}

fn setup_event_listeners(app_handle: Arc<AppHandle>) {
    log::info!("Setting up event listeners");
    let start_firmware_download_app_handle = app_handle.clone();

    frontend_events::StartFirmwareDownload::listen(
        &start_firmware_download_app_handle.clone(),
        move |_, payload| {
            log::info!("In startfirmwaredownload callback");
            start_firmware_download_handler(start_firmware_download_app_handle.clone(), payload);
        },
    );

    let version_selected_app_handle = app_handle.clone();

    frontend_events::VersionSelected::listen(
        &version_selected_app_handle.clone(),
        move |_event, payload| {
            log::info!(
                "User created: Version={:?}, DownloadLink={}",
                payload.version,
                payload.path
            );

            let state_set_app_handle = version_selected_app_handle.clone();

            tauri::async_runtime::spawn(async move {
                use crate::firmware::ArchiveSource;
                let state = state_set_app_handle.state::<AppState>();

                let mut state_guard = state.lock().await;

                // Determine archive source from payload.path
                if payload.path.starts_with("http://") || payload.path.starts_with("https://") {
                    state_guard.archive_source = ArchiveSource::RemoteUrl(payload.path.clone());
                } else {
                    state_guard.archive_source =
                        ArchiveSource::LocalPath(std::path::PathBuf::from(payload.path.clone()));

                    state_guard.size = 0;
                }

                state_guard.version = payload.version.clone().unwrap_or_default();
            });
        },
    );

    let app_handle = app_handle.clone();

    frontend_events::FrontendLoaded::listen(&app_handle.clone(), move |_event, _| {
        log::info!("Frontend has been loaded");

        // Start device provider (tycmd implementation by default)
        let provider = TycmdProvider;

        provider.start(&app_handle.clone());

        let app_handle = app_handle.clone();

        tauri::async_runtime::spawn(async move {
            let state = app_handle.state::<AppState>();

            let mut state_guard = state.lock().await;

            let digest = devices_digest(&state_guard.devices);

            let should_emit =
                !matches!(state_guard.last_devices_digest, Some(prev) if prev == digest);

            if should_emit {
                state_guard.last_devices_digest = Some(digest);
                let _ = app_handle.emit_to(
                    "main",
                    "serial-watch-update",
                    SerialWatchUpdatePayload {
                        devices: state_guard.devices.clone(),
                    },
                );
            }
        });
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // // Initialize the tracing subscriber
    // // tracing_subscriber::fmt::init();
    // // a builder for `FmtSubscriber`.
    // let subscriber = FmtSubscriber::builder()
    //     // all spans/events with a level higher than TRACE (e.g, debug, info, warn, etc.)
    //     // will be written to stdout.
    //     .with_max_level(Level::TRACE)
    //     // completes the builder.
    //     .finish();

    // tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    // tracing_subscriber::fmt()
    //     .compact()
    //     // .event_format(tracing_subscriber::fmt().compact())
    //     .init();

    // let stdout_log = tracing_subscriber::fmt::layer().compact(); //  .pretty();

    // tracing_subscriber::registry()
    //     .with(
    //         stdout_log
    //             // Add an `INFO` filter to the stdout logging layer
    //             .with_filter(filter::LevelFilter::INFO)
    //             .
    //     )
    //     .init();

    let mut builder = tauri::Builder::default();

    // Single instance must be the first plugin registered to integrate with deep-link
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(main_window) = app.get_webview_window("main") {
                if let Err(e) = main_window.set_focus() {
                    log::error!("Failed to set focus to main window: {}", e);
                }
                // set transparent title bar and background color only when building for macOS
                #[cfg(target_os = "macos")]
                {
                    if let Err(err) =
                        main_window.set_title_bar_style(tauri::TitleBarStyle::Transparent)
                    {
                        log::info!("Error setting title bar transparency {:?}", err);
                    }
                }
            } else {
                log::warn!("Main window not found");
            }
        }));
        // .plugin(
        //     tauri_plugin_log::Builder::new()
        //         .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        //         .level(log::LevelFilter::Info)
        //         .level_for("tauri::manager", log::LevelFilter::Error)
        //         .target(tauri_plugin_log::Target::new(
        //             tauri_plugin_log::TargetKind::LogDir {
        //                 file_name: Some(format!(
        //                     "logs-{}",
        //                     chrono::Local::now().format("%Y-%m-%d")
        //                 )),
        //             },
        //         ))
        //         .target(tauri_plugin_log::Target::new(
        //             tauri_plugin_log::TargetKind::Webview,
        //         ))
        //         // TODO: Maybe we want local timestamps? Unsure.
        //         // .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        //         .build(),
        // );
    }

    // https://docs.crabnebula.dev/devtools/troubleshoot/log-plugins/
    // Note: If you’re running CrabNebula DevTools next to another tracing/log plugin or crate,
    // DevTools will prevent any other logger from being initialized.
    // Error while running Tauri application:
    // PluginInitialization("log", "attempted to set a logger after the logging system was already initialized")
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_devtools::init());
    }

    // let mut builder = tauri::Builder::default()
    builder = builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init());

    let pinia_builder = tauri_plugin_pinia::Builder::new()
        .save_denylist(["installation", "serial-port-info"])
        .sync_denylist(["firmware", "installation", "serial-port-info"]);

    let pinia_builder = if let Ok(path) = env::var("PINIA_STORE_PATH") {
        pinia_builder.path(path)
    } else {
        pinia_builder
    };

    builder = builder.plugin(pinia_builder.build());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_window_state::Builder::default().build());
    }

    // TODO: More modern way of instantiating application looks like:
    // .run(tauri::generate_context!())
    // .expect("error while running tauri application");

    if let Err(e) = builder.setup(setup).run(tauri::generate_context!()) {
        eprintln!("Error while running Tauri application: {e:?}");
        log::error!("Error while running Tauri application: {}", e);
        // panic!("here");
    }
}
