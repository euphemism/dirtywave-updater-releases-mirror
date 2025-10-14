use crate::{
    events::frontend_events::UploadStatus,
    serial::tycmd::{tycmd_list, tycmd_watch},
};
use async_trait::async_trait;
use tauri::AppHandle;

pub trait DeviceProvider: Send + Sync {
    fn start(&self, app_handle: &AppHandle);
}

#[async_trait]
pub trait FirmwareUploader: Send + Sync {
    async fn upload_firmware(
        &self,
        firmware_path: &str,
        board_tag: &str,
        on_progress: Box<dyn Fn(UploadStatus) + Send + Sync>,
    ) -> Result<(), anyhow::Error>;
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
