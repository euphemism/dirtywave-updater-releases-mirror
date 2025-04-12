import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SettingsButton from 'src/components/SettingsButton.vue';

installQuasarPlugin();

describe('SettingsButton.vue', () => {
  it('mounts and renders q-btn/q-icon', () => {
    const wrapper = mount(SettingsButton);
    expect(wrapper.find('.settings-button').exists()).toBe(true);
    expect(wrapper.find('.settings-button-update-hint').exists()).toBe(true);
  });
});

