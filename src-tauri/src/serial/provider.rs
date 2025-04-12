use tauri::AppHandle;

use crate::serial::tycmd::{tycmd_list, tycmd_watch};

pub trait DeviceProvider: Send + Sync {
    fn start(&self, app_handle: &AppHandle);
}

#[derive(Default)]
pub struct TycmdProvider;

impl DeviceProvider for TycmdProvider {
    fn start(&self, app_handle: &AppHandle) {
        let handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            tycmd_list(&handle).await;
            tycmd_watch(&handle).await;
        });
    }
}
