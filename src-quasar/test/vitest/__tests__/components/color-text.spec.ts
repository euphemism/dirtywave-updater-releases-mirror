import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ColorText from "src/components/ColorText.vue";

installQuasarPlugin();

vi.mock("src/composables", () => ({
	useDistanceToElements: () => ({ distances: { value: [0] } }),
}));

describe("ColorText.vue", () => {
	it("renders slot content", () => {
		const wrapper = mount(ColorText, { slots: { default: "Hi" } });
		expect(wrapper.text()).toContain("Hi");
	});
});
