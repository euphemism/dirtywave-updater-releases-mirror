import { storeToRefs } from "pinia";
import { registerIpcEventListener } from "src/utils";
import { deviceStatus } from "src/utils/serial";
import { useInstallationStore } from "src/stores/installation";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import type { IpcEventPayloads, DeviceMap } from "src/types";

let unlistenSerial: null | (() => void) = null;
let listenersStarted = false;
// let pendingSerialPayload: IpcEventPayloads["serial-watch-update"] | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
// const FLUSH_DELAY_MS = 50;

function mapsEqual(a: DeviceMap, b: DeviceMap) {
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	return bKeys.every((k) => {
		const av = a[k];
		const bv = b[k];
		if (!av || !bv) return false;
		try {
			return JSON.stringify(av) === JSON.stringify(bv);
		} catch {
			return false;
		}
	});
}

export function useDevicesController() {
	const installationStore = useInstallationStore();
	const serialStore = useSerialPortInfoStore();
	const { devices } = storeToRefs(serialStore);

	function applySerialPayload(
		payload: IpcEventPayloads["serial-watch-update"],
	) {
    console.log('applySerialPayload');

		const nextDevices = Object.fromEntries(
			Object.entries(payload.devices)?.map(([id, device]) => [
				id,
				{
					...device,
					ty_cmd_info: {
						...device.ty_cmd_info,
						capabilities: device.ty_cmd_info.capabilities.filter(
							(bility) => !["rtc", "unique"].includes(bility),
						),
					},
				},
			]),
		);

    console.log('filtered devices');

		// Only patch Pinia if devices actually changed (reduces IPC churn)
		if (!mapsEqual(serialStore.devices ?? {}, nextDevices)) {
      console.log('devices changed');
			serialStore.devices = nextDevices;
		} else {
    console.log('devices unchanged');
    }

		if (serialStore.selectedDeviceTag) {
			const device = serialStore.devices[serialStore.selectedDeviceTag];
      console.log(serialStore.selectedDeviceTag, 'capabilities', JSON.stringify(device?.ty_cmd_info.capabilities), 'upload state', installationStore.uploadState);
			if (
				device?.ty_cmd_info.capabilities.includes("serial") &&
				installationStore.uploadState === "Finalizing"
			) {
				installationStore.uploadState = "Stopped";
			}
		} else {
      console.log('no selectedDeviceTag');

			const [tag, device] =
				Object.entries(serialStore.devices ?? {})?.[0] ?? [];

      console.log('first device:', tag, 'status', deviceStatus(device));

			if (
				tag &&
				device &&
				deviceStatus(device) === "Ready" &&
				serialStore.selectedDeviceTag !== tag
			) {
				serialStore.selectedDeviceTag = tag;
			}
		}
	}

  // 	function flushSerialPayload() {
  //   console.log('flushSerialPayload');
	// 	if (!pendingSerialPayload) {
  //     return;
  //   }

	// 	const payload = pendingSerialPayload;

	// 	pendingSerialPayload = null;

	// 	flushTimer = null;

	// 	applySerialPayload(payload);
	// }

	function handleSerialWatchUpdate(
		payload: IpcEventPayloads["serial-watch-update"],
	) {
    const key = Object.keys(payload?.devices)?.[0];
    const device = payload?.devices[key ?? ''];

    console.log('handleSerialWatchUpdate');
    console.log('|', JSON.stringify(device?.ty_cmd_info), '|');

		// pendingSerialPayload = payload;

		// if (!flushTimer) {
		// 	flushTimer = setTimeout(flushSerialPayload, FLUSH_DELAY_MS);
		// }

    applySerialPayload(payload)
    console.log('after applySerialPayload');
	}

	async function startListeners() {
		if (listenersStarted) {
      return;
    }

		unlistenSerial = await registerIpcEventListener(
			"serial-watch-update",
			handleSerialWatchUpdate,
		);

		listenersStarted = true;
	}

	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			try {
				unlistenSerial?.();
			} catch {
				/* noop */
			}
			if (flushTimer) clearTimeout(flushTimer);
			// pendingSerialPayload = null;
			flushTimer = null;
			unlistenSerial = null;
			listenersStarted = false;
		});
	}

	return {
		devices,
		startListeners,
	} as const;
}
