import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { describe, expect, it, beforeEach, vi } from "vitest";
import SerialPortList from "src/components/SerialPortList.vue";
import { useInstallationStore } from "src/stores/installation";
import type { DeviceMap } from "src/types";

installQuasarPlugin();

vi.mock("src/composables", () => ({
	useDistanceToElements: () => ({ distances: { value: [0] } }),
}));

vi.mock("src/utils", () => ({
	deviceIsMissing: (d: unknown) =>
		(d as { action_history: string[] }).action_history.at(-1) === "miss",
	deviceStatus: () => "Ready",
	formatDuration: () => "1s",
	colorTween: ({ from, to }: { from?: string; to?: string }) =>
		to ?? from ?? "#000",
}));

describe("SerialPortList.vue", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	const present: DeviceMap = {
		dev1: {
			action_history: ["add"],
			device_type: "MODEL01",
			ty_cmd_info: {
				action: "add",
				capabilities: ["serial"],
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

	const missing: DeviceMap = {
		dev1: {
			action_history: ["miss"],
			device_type: "MODEL01",
			ty_cmd_info: {
				action: "miss",
				capabilities: ["serial"],
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

	it("renders device list when present", () => {
		const installation = useInstallationStore();
		installation.uploadState = "Stopped";
		const wrapper = mount(SerialPortList, { props: { devices: present } });
		expect(wrapper.text()).toContain("S/N");
	});

	it("shows troubleshooting content when all devices missing", () => {
		const installation = useInstallationStore();
		installation.uploadState = "Stopped";
		const wrapper = mount(SerialPortList, { props: { devices: missing } });
		expect(wrapper.text()).toContain("Why is my M8 not showing up?");
	});
});
