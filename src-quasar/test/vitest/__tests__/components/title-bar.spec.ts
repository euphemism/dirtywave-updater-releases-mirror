import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TitleBar from "src/components/TitleBar.vue";

installQuasarPlugin();

vi.mock("src/components/SettingsButton.vue", () => ({
	default: {
		name: "SettingsButton",
		template:
			'<button class="settings-btn" @click="$emit(\'click\')">S</button>',
	},
}));

describe("TitleBar.vue", () => {
	it("emits settings and close events on clicks", async () => {
		const wrapper = mount(TitleBar);

		await wrapper.find(".settings-btn").trigger("click");
		expect(wrapper.emitted("settings")?.length ?? 0).toBeGreaterThan(0);

		// Close button is the rightmost top control with icon="close"; trigger first button in right controls group
		const buttons = wrapper.findAll("button");
		await buttons.at(-1)?.trigger("click");
		expect(wrapper.emitted("close")?.length ?? 0).toBeGreaterThan(0);
	});
});
