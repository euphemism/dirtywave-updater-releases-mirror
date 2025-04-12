import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import VersionNumber from "src/components/VersionNumber.vue";

installQuasarPlugin();

// Stabilize distance logic to avoid DOM coupling
vi.mock("src/composables/use-distance-to-elements.ts", () => ({
	useDistanceToElements: () => ({ distances: { value: [0] } }),
}));

describe("VersionNumber.vue", () => {
	it("shows version text", () => {
		const wrapper = mount(VersionNumber, {
			props: { version: "1.2.3", selected: false },
		});
		expect(wrapper.find("span.version-number").text()).toBe("1.2.3");
	});
});
