import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { describe, expect, it, beforeEach, vi } from "vitest";
import DeviceSelectOption from "src/components/DeviceSelectOption.vue";
import { useInstallationStore } from "src/stores/installation";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import type { ConnectedDevice } from "src/types";

installQuasarPlugin();

vi.mock("src/composables", () => ({
	useDistanceToElements: () => ({ distances: { value: [0] } }),
}));

vi.mock("src/utils", () => ({
	deviceStatus: (_device: ConnectedDevice) => "Ready",
	formatDuration: (_ms: number) => "1s",
	colorTween: ({ from, to }: { from?: string; to?: string }) =>
		to ?? from ?? "#000",
}));

describe("DeviceSelectOption.vue", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	const device: ConnectedDevice = {
		action_history: ["add"],
		device_type: "MODEL01",
		ty_cmd_info: {
			action: "add",
			capabilities: ["serial", "run"],
			description: "M8",
			interfaces: [["Serial", "/dev/tty"]],
			location: "usb",
			model: "Teensy 4.0",
			serial: "123",
			tag: "dev1",
		},
		updated_at: Date.now(),
	};

	it("renders placeholder when showPlaceholder", () => {
		const wrapper = mount(DeviceSelectOption, {
			props: { showPlaceholder: true },
		});
		expect(wrapper.text()).toContain("--");
	});

	it("renders device info", () => {
		const installation = useInstallationStore();
		installation.uploadState = "Stopped";
		const serial = useSerialPortInfoStore();
		serial.selectedDeviceTag = "dev1";

		const wrapper = mount(DeviceSelectOption, { props: { device } });
		expect(wrapper.text()).toContain("M8 MODEL01");
		expect(wrapper.text()).toContain("123");
		expect(wrapper.text()).toContain("Ready");
	});
});
