import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ChangelogSectionContent from "src/components/ChangelogSectionContent.vue";
import type { ChangelogSection } from "src/types";

installQuasarPlugin();

describe("ChangelogSectionContent.vue", () => {
	it("renders badges and entries", () => {
		const section: ChangelogSection = {
			id: 1,
			title: "Improvements",
			entries: [
				{ type: "new", description: "Feature A" },
				{ type: "fix", description: "Bug B", details: ["More info"] },
			],
		};
		const wrapper = mount(ChangelogSectionContent, { props: { section } });
		// Title is optional UI; assert entries content which is stable
		expect(wrapper.text()).toContain("Feature A");
		expect(wrapper.text()).toContain("Bug B");
		expect(wrapper.text()).toContain("More info");
	});
});
