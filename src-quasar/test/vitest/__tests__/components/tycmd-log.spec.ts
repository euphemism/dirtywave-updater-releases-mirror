import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TycmdLog from "src/components/TycmdLog.vue";
import type { LogEntry } from "src/types/installation";

installQuasarPlugin();

describe("TycmdLog.vue", () => {
	it("renders entries and marks errors", () => {
		const entries: LogEntry[] = [
			{ line: "ok", state: "Uploading" },
			{ line: "bad", state: "Error" },
		];
		const wrapper = mount(TycmdLog, { props: { entries } });
		expect(wrapper.text()).toContain("ok");
		expect(wrapper.text()).toContain("bad");
		const items = wrapper.findAll("li");
		expect(items[2]?.classes()).toContain("text-negative");
	});

	it("renders empty container when no entries", () => {
		const wrapper = mount(TycmdLog, { props: { entries: [] } });
		expect(wrapper.find(".tycmd-log").exists()).toBe(true);
	});
});
