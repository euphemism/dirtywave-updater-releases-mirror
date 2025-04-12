import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import FileUploader from 'src/components/FileUploader.vue';

installQuasarPlugin();

vi.mock('src/composables/use-drag-drop-listener', () => ({
  useDragDropListener: () => ({ maybePaths: [], paths: [{ name: 'firmware.hex', path: '/tmp/firmware.hex' }] })
}));

describe('FileUploader.vue', () => {
  it('lists dropped file names', () => {
    const wrapper = mount(FileUploader);
    expect(wrapper.text()).toContain('firmware.hex');
  });
});

