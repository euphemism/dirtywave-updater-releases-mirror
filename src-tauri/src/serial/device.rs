use serde::{Deserialize, Serialize};

use crate::{
    events::frontend_events::{DownloadStatus, UploadStatus},
    firmware::ConnectedDevice,
};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind")]
pub enum DeviceState {
    Disconnected,
    Ready {
        device: ConnectedDevice,
    },
    Downloading {
        device: ConnectedDevice,
        status: DownloadStatus,
    },
    Uploading {
        device: ConnectedDevice,
        status: UploadStatus,
    },
    Error {
        device: ConnectedDevice,
        message: String,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DeviceStateUpdatePayload {
    pub state: DeviceState,
}
