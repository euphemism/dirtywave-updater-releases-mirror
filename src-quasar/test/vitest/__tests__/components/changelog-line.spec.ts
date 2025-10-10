import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChangelogLine from 'src/components/ChangelogLine.vue';

installQuasarPlugin();

describe('ChangelogLine.vue', () => {
  it('tokenizes and renders line content', () => {
    const wrapper = mount(ChangelogLine, { props: { line: 'Fix: issue #123' } });
    expect(wrapper.text()).toContain('Fix: issue #123');
  });
});

