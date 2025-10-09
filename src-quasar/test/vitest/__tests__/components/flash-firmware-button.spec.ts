import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import FlashFirmwareButton from 'src/components/FlashFirmwareButton.vue';

installQuasarPlugin();

describe('FlashFirmwareButton.vue', () => {
  it('renders button when not flashing and emits click', async () => {
    const onClick = vi.fn();
    const wrapper = mount(FlashFirmwareButton, { props: { isFlashing: false, onClick } });
    expect(wrapper.find('.flash-firmware-button').exists()).toBe(true);
    await wrapper.find('.flash-firmware-button').trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows status when flashing', () => {
    const wrapper = mount(FlashFirmwareButton, { props: { isFlashing: true, disable: true } });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('.flash-firmware-button').exists()).toBe(false);
  });
});

