import { sep } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { useInstallationController } from 'src/composables/controllers/use-installation-controller';
import { parseFirmwareFilename } from 'src/utils/filename-parsing';

export const usePickCustomFirmware = () => {
  return async () => {
    const { selectCustomPath } = useInstallationController();

    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: 'Firmware', extensions: ['hex', 'zip'] },
      ],
    });

    if (typeof selected === 'string' && selected.length > 0) {
      const filename = selected.split(sep()).pop() ?? '';

      const parsed = parseFirmwareFilename(filename);

      await selectCustomPath(selected, parsed?.version ?? '?');
    }

    return selected;
  }
}
