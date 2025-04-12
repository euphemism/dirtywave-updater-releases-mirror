import { acceptHMRUpdate, defineStore } from 'pinia';
import type { ConnectedDevice, DeviceMap } from 'src/types';

type SerialPortInfoStoreState = {
	devices: DeviceMap;
	selectedDeviceTag: string | null;
};
export const useSerialPortInfoStore = defineStore<
	'serial-port-info',
	SerialPortInfoStoreState,
	{
		deviceCount: (state: SerialPortInfoStoreState) => number;
		selectedDevice: (state: SerialPortInfoStoreState) => ConnectedDevice | null;
	}
>('serial-port-info', {
	state: () => ({
		devices: {},
		selectedDeviceTag: null,
	}),
	getters: {
		deviceCount: (state) => Object.keys(state.devices).length,
		selectedDevice: (state) => (state.selectedDeviceTag ? (state.devices[state.selectedDeviceTag] ?? null) : null),
	},
	actions: {},
	tauri: {
		save: false,
    saveOnChange: false,
    sync: false
	},
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useSerialPortInfoStore, import.meta.hot));
}
