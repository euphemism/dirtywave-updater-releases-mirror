import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BasicLabel from 'src/components/BasicLabel.vue';

installQuasarPlugin();

describe('BasicLabel.vue', () => {
  it('renders slot content', () => {
    const wrapper = mount(BasicLabel, { slots: { default: 'Hello' } });
    expect(wrapper.text()).toContain('Hello');
  });
});

