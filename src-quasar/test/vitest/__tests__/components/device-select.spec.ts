import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { describe, expect, it, beforeEach, vi } from "vitest";
import DeviceSelect from "src/components/DeviceSelect.vue";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import type { DeviceMap } from "src/types";

installQuasarPlugin();

vi.mock("src/composables", () => ({
	useDistanceToElements: () => ({ distances: { value: [0] } }),
}));

describe("DeviceSelect.vue", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	const devices: DeviceMap = {
		dev1: {
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
		},
	};

	it("shows no-device-selected message when none selected", () => {
		const wrapper = mount(DeviceSelect, { props: { devices } });
		expect(wrapper.text()).toContain("No device selected");
	});

	it("shows selected device when store tag set", async () => {
		const serial = useSerialPortInfoStore();
		const wrapper = mount(DeviceSelect, { props: { devices } });
		serial.selectedDeviceTag = "dev1";
		await wrapper.vm.$nextTick();
		expect(wrapper.find(".no-device-selected-message").exists()).toBe(false);
	});
});
