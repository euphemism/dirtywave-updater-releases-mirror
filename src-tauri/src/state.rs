use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use crate::firmware::{ArchiveSource, ConnectedDevice, ConnectedDeviceList};

#[derive(Default)]
pub struct AppStateData {
    pub cache_dir: Option<Box<tauri_plugin_fs::FilePath>>,
    pub connected_: ConnectedDeviceList,
    pub devices: HashMap<String, ConnectedDevice>,
    pub last_devices_digest: Option<u64>,
    pub archive_source: ArchiveSource,
    pub size: u64,
    pub temp_dir: Option<Box<tauri_plugin_fs::FilePath>>,
    pub version: String,
}

pub fn devices_digest(devices: &HashMap<String, ConnectedDevice>) -> u64 {
    // Serialize to a deterministic string and hash it; cheap and dependency-free
    let json = serde_json::to_string(devices).unwrap_or_default();

    let mut hasher = DefaultHasher::new();

    json.hash(&mut hasher);

    hasher.finish()
}

pub type AppState = tokio::sync::Mutex<AppStateData>;

// pub setup_store(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {

// }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::firmware::{ConnectedDevice, DeviceType};
    use crate::serial::tycmd::TyCmdListEntry;

    fn sample_entry(serial: &str, tag: &str) -> TyCmdListEntry {
        TyCmdListEntry {
            action: "add".into(),
            capabilities: vec!["serial".into(), "run".into()],
            description: "M8".into(),
            interfaces: vec![vec!["Serial".into(), "/dev/tty.usb".into()]],
            location: "usb-1-1".into(),
            model: "Teensy 4.0".into(),
            serial: serial.into(),
            tag: tag.into(),
        }
    }

    fn sample_device(serial: &str, tag: &str) -> ConnectedDevice {
        ConnectedDevice {
            action_history: vec!["add".into()],
            device_type: DeviceType::MODEL01,
            ty_cmd_info: sample_entry(serial, tag),
            updated_at: 0,
        }
    }

    #[test]
    fn digest_changes_with_content() {
        let mut a: HashMap<String, ConnectedDevice> = HashMap::new();
        a.insert("dev1".into(), sample_device("123", "dev1"));

        let mut b = a.clone();
        b.insert("dev2".into(), sample_device("456", "dev2"));

        let da = devices_digest(&a);
        let db = devices_digest(&b);
        assert_ne!(da, db);

        // identical map yields identical digest
        let da2 = devices_digest(&a);
        assert_eq!(da, da2);
    }
}
