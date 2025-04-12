import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SelectedVersion from 'src/components/SelectedVersion.vue';

installQuasarPlugin();

describe('SelectedVersion.vue', () => {
  it('renders selected version', () => {
    const wrapper = mount(SelectedVersion, { props: { selectedVersion: '1.2.3' } });
    expect(wrapper.text()).toContain('1.2.3');
  });

  it('shows placeholder when none selected', () => {
    const wrapper = mount(SelectedVersion, { props: { selectedVersion: null } });
    expect(wrapper.text()).toContain('---');
  });
});

