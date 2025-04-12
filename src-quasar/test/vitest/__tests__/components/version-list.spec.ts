import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import VersionList from "src/components/VersionList.vue";
import type { Firmware } from "src/types";

installQuasarPlugin();

vi.mock("src/composables", () => ({
	useDistanceToElements: () => ({ distances: { value: [0, 0] } }),
}));

vi.mock("src/composables/controllers/use-firmware-controller", async () => {
	const entries: Firmware[] = [
		{
			changelog: [{ id: 1, entries: [], title: "t" }],
			date: "2024-01-01",
			path: "/a.zip",
			version: "1.0.0",
		},
		{ changelog: [], date: "2023-12-01", path: '/b.zip', version: "0.9.0" },
	];
	const { ref } = await import("vue");
	const entriesRef = ref(entries);
	const selectedVersion = ref<string | null>("1.0.0");
	const selectVersion = vi.fn((v: string | null) => {
		selectedVersion.value = v;
	});
	const fetchFirmwareList = vi.fn(async () => {
		/* no-op */
	});
	return {
		useFirmwareController: () => ({
			entries: entriesRef,
			selectedVersion,
			selectVersion,
			fetchFirmwareList,
		}),
	};
});

describe("VersionList.vue", () => {
	it("renders entries and hides radio for entries without path", () => {
		const wrapper = mount(VersionList);
		// two q-item entries
		const items = wrapper.findAll(".firmware");
		expect(items.length).toBe(2);
		const first = items[0];
		const second = items[1];
		if (!first || !second) throw new Error("expected two items");
		// First has a path, its radio not invisible
		const firstRadio = first.find(".select-button");
		expect(firstRadio.classes()).not.toContain("invisible");
		// Second has no path, radio should be invisible
		const secondRadio = second.find(".select-button");
		expect(secondRadio.classes()).toContain("invisible");
	});
});
