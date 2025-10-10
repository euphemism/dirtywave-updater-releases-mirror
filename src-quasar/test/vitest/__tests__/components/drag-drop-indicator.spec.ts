import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import DragDropIndicator from "src/components/DragDropIndicator.vue";

installQuasarPlugin();

vi.mock("src/composables/use-drag-drop-listener", () => ({
	useDragDropListener: () => ({ maybePaths: ["a.hex"], paths: [] }),
}));

describe("DragDropIndicator.vue", () => {
	it("teleports overlay when maybePaths present", () => {
		const overlay = document.createElement("div");
		overlay.id = "overlay";
		document.body.appendChild(overlay);

		const wrapper = mount(DragDropIndicator, { attachTo: document.body });
		expect(document.body.innerHTML).toContain("file-drop-zone-content");
		wrapper.unmount();

		document.body.removeChild(overlay);
	});
});
