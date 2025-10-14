export type DownloadState = 'Stopped' | 'Starting' | 'Downloading' | 'Complete' | 'Error';

export type UploadState = 'Stopped' | 'Initializing' | 'Starting' | 'Uploading' | 'Finalizing' | 'Error';

// add   	This board was plugged in or was already there
// change 	Something changed, maybe the board rebooted
// miss 	This board is missing, either it was unplugged (remove) or it is changing mode
// remove 	This board has been missing for some time, consider it removed

export type Capability = 'reboot' | 'reset' | 'rtc' | 'run' | 'serial' | 'unique' | 'upload';

export type DeviceAction = 'add' | 'change' | 'miss' | 'remove';

export type DeviceType = 'HEADLESS' | 'MODEL01' | 'MODEL02' | 'UNKNOWN';

export type TyCmdListEntry = {
	action: DeviceAction;
	capabilities: Capability[];
	description: string;
	interfaces: string[][];
	location: string;
	model: string;
	serial: string;
	tag: string;
};

export type Device = {
	action_history: DeviceAction[];
	device_type: DeviceType;
	ty_cmd_info: TyCmdListEntry;
	updated_at: number;
};

// export type DeviceMap = Record<string, ConnectedDevice>;

// export type SerialWatchUpdate = {
// 	devices: DeviceMap;
// };

// export type SerialPortInfo = {
// 	port_name: string;
// 	port_type: {
// 		UsbPort: {
// 			manufacturer: string;
// 			pid: number;
// 			product: string;
// 			serial_number: string;
// 			vid: number;
// 		};
// 	};
// };

// export type FlashingCycle = 'Downloading' | 'Uploading';

export type OptionalLog = {
	log: string | null;
};

export type DownloadStatus = OptionalLog & {
	bytes_downloaded: number;
	size: number;
	state: DownloadState;
};

export type UploadStatus = OptionalLog & {
	state: UploadState;
};

// export type FlashingDownloadStatus = {
// 	cycle: 'Downloading';
// 	status: {
// 		Downloading: DownloadStatus;
// 	};
// };

// export type FlashingUploadStatus = {
// 	cycle: 'Uploading';
// 	status: {
// 		Uploading: UploadStatus;
// 	};
// };

// export type FlashingStatus = FlashingDownloadStatus | FlashingUploadStatus;

// export const isFlashingDownloadStatus = (flashingStatus: FlashingStatus): flashingStatus is FlashingDownloadStatus =>
// 	flashingStatus.cycle === 'Downloading';

// export const isFlashingUploadStatus = (flashingStatus: FlashingStatus): flashingStatus is FlashingUploadStatus =>
// 	flashingStatus.cycle === 'Uploading';

export type IpcEvent = 'device-state-update';// 'flashing-status' | 'serial-watch-update';

type PayloadWrapper<
	R extends {
		[k in IpcEvent]: unknown;
	},
> = R;

export type DeviceState =
  | { kind: "Disconnected" }
  | { kind: "Ready"; device: Device }
  | { kind: "Downloading"; device: Device; status: DownloadStatus }
  | { kind: "Uploading"; device: Device; status: UploadStatus }
  | { kind: "Error"; device: Device; message: string };

export type DeviceStateUpdate = {
  state: DeviceState;
};

export type IpcEventPayloads = PayloadWrapper<{
  'device-state-update': DeviceStateUpdate
	// 'flashing-status': FlashingStatus;
	// 'serial-watch-update': SerialWatchUpdate;
}>;
