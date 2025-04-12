import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import { useInstallationStore } from "src/stores/installation";
import type { IpcEventPayloads, Capability } from "src/types";

// Capture the IPC callback the controller registers so tests can drive it
let registeredCallback:
	| ((payload: IpcEventPayloads["serial-watch-update"]) => void)
	| null = null;

// Helper to build a typed Capability[] without assertions
const capList = (...items: Capability[]) => items;

vi.mock("src/utils", () => ({
	registerIpcEventListener: vi.fn(
		(
			_event: "serial-watch-update",
			cb: (payload: IpcEventPayloads["serial-watch-update"]) => void,
		) => {
			registeredCallback = cb;
			return () => {
				/* unlisten noop */
			};
		},
	),
}));

const now = Date.now();

const devicePayload = (
	capabilities: Capability[] = ["serial", "run"],
	action: "add" | "change" | "miss" | "remove" = "add",
): IpcEventPayloads["serial-watch-update"] => ({
	devices: {
		dev1: {
			action_history: [action],
			device_type: "MODEL01",
			ty_cmd_info: {
				action,
				capabilities,
				description: "M8",
				interfaces: [["usb"]],
				location: "usb-1-1",
				model: "Teensy 4.0",
				serial: "123",
				tag: "dev1",
			},
			updated_at: now,
		},
	},
});

describe("useDevicesController", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		registeredCallback = null;
		vi.resetModules();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it("registers a debounced serial-watch-update handler and filters out rtc/unique", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();
		expect(typeof registeredCallback).toBe("function");

		const serialStore = useSerialPortInfoStore();

		// Send a payload containing rtc/unique; they should be filtered out
		registeredCallback!(
			devicePayload(capList("rtc", "unique", "serial", "run"), "add"),
		);

		// Debounce flush
		vi.advanceTimersByTime(60);

		expect(Object.keys(serialStore.devices)).toEqual(["dev1"]);
		const dev = serialStore.devices["dev1"];
		if (!dev) throw new Error("Expected dev1 device");
		const deviceCaps = dev.ty_cmd_info.capabilities;
		expect(deviceCaps).toContain("serial");
		expect(deviceCaps).not.toContain("rtc");
		expect(deviceCaps).not.toContain("unique");
	});

	it("auto-selects first Ready device when none selected", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();

		const serialStore = useSerialPortInfoStore();
		expect(serialStore.selectedDeviceTag).toBeNull();

		registeredCallback!(devicePayload(capList("serial", "run"), "add"));
		vi.advanceTimersByTime(60);

		expect(serialStore.selectedDeviceTag).toBe("dev1");
	});

	it("does not patch devices if payload did not change (mapsEqual)", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();

		const serialStore = useSerialPortInfoStore();

		const payload = devicePayload(capList("serial", "run"), "add");

		registeredCallback!(payload);
		vi.advanceTimersByTime(60);

		const firstRef = serialStore.devices;

		// Send identical payload; debounced apply should see equality and skip assignment
		registeredCallback!(payload);
		vi.advanceTimersByTime(60);

		expect(serialStore.devices).toBe(firstRef);
	});

	it("stops upload when selected device is serial-capable and upload is Finalizing", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();

		const serialStore = useSerialPortInfoStore();
		const installation = useInstallationStore();

		// Prime selection and state
		serialStore.selectedDeviceTag = "dev1";
		installation.uploadState = "Finalizing";

		registeredCallback!(devicePayload(capList("serial", "run"), "change"));
		vi.advanceTimersByTime(60);

		expect(installation.uploadState).toBe("Stopped");
	});

	it("debounces rapid events and applies only the last payload in the window", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();

		const serialStore = useSerialPortInfoStore();

		// First payload: has a device
		registeredCallback!(devicePayload(capList("serial"), "add"));
		// Second payload immediately: empty devices map
		registeredCallback!({ devices: {} });

		vi.advanceTimersByTime(60);

		expect(serialStore.devices).toEqual({});
	});

	it("retains selected device when capabilities change but remains Ready", async () => {
		const { useDevicesController } = await import(
			"src/composables/controllers/use-devices-controller"
		);
		const { startListeners } = useDevicesController();
		await startListeners();

		const serialStore = useSerialPortInfoStore();

		// Initially add device with serial+run
		registeredCallback!(devicePayload(capList("serial", "run"), "add"));
		vi.advanceTimersByTime(60);
		expect(serialStore.selectedDeviceTag).toBe("dev1");

		// Capabilities change but still contains serial -> stays Ready and selection remains
		registeredCallback!(devicePayload(capList("serial"), "change"));
		vi.advanceTimersByTime(60);
		expect(serialStore.selectedDeviceTag).toBe("dev1");
	});
});
