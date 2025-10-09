import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFirmwareController } from "src/composables/controllers/use-firmware-controller";
import { useInstallationStore } from "src/stores/installation";
import { useFirmwareStore } from "src/stores/firmware";

vi.mock("@tauri-apps/api/event", () => ({
	emitTo: vi.fn(async () => Promise.resolve()),
}));

describe("useFirmwareController", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("exposes firmwares, entries and selectedVersion", () => {
		const firmwareStore = useFirmwareStore();
		firmwareStore.firmwares = [
			{
        changelog: [{ id: 1, entries: [{ description: "X", type: "new" }] }],
        path: '/a.zip',
				version: "3.0.0",
			},
			{ changelog: [{ id: 2, entries: [] }], path: '/b.zip', version: "2.0.0" },
			{ changelog: [], path: "M8Firmware.zip", version: "1.0.0" },
		];

		const { firmwares, entries, selectedFirmware } = useFirmwareController();

		expect(firmwares.value.map((f) => f.version)).toEqual([
			"3.0.0",
			"2.0.0",
			"1.0.0",
		]);
		// entries filters to where changelog has entries or a path exists
		expect(entries.value.map((f) => f.version)).toEqual(["3.0.0", "1.0.0"]);
		expect(selectedFirmware.value).toBeNull();
	});

	it("isSelected reflects selection and selectVersion delegates properly", async () => {
		const firmwareStore = useFirmwareStore();
		firmwareStore.firmwares = [
			{
				changelog: [],
				path: "Releases/M8Firmware_V1_2_3.zip",
				version: "1.2.3",
			},
		];

		const { isSelected, selectVersion, selectedFirmware } =
			useFirmwareController();

		expect(isSelected("1.2.3")).toBe(false);

		await selectVersion("1.2.3");

		expect(selectedFirmware.value?.version).toBe("1.2.3");

		expect(isSelected("1.2.3")).toBe(true);
	});

	it("selectVersion accepts a custom path object and sets sentinel version", async () => {
		const installation = useInstallationStore();
		const { selectVersion } = useFirmwareController();

		await selectVersion({ path: "/tmp/custom.hex", source: 'local', version: '6.2.0' });

		expect(installation.selectedFirmware?.path).toBe("/tmp/custom.hex");
    expect(installation.selectedFirmware?.source).toBe("local");
    expect(installation.selectedFirmware?.version).toBe("6.2.0");
	});
});
