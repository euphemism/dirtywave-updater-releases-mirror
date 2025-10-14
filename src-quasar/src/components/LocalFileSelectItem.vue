<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import VersionListItem from 'components/VersionListItem.vue';
import { useInstallationStore } from 'src/stores/installation';
import { parseFirmwareFilename } from 'src/utils/filename-parsing';
import { usePickCustomFirmware } from 'src/composables/use-pick-custom-firmware';
import { useDeviceStateController } from 'src/composables/controllers/use-device-state-controller';
import { useFirmwareController } from 'src/composables/controllers/use-firmware-controller';
import { useDistanceToElements } from 'src/composables';
import type { QRadio } from 'quasar';
import { getCssVar } from 'quasar';
import { colorTween } from 'src/utils';

const { cachedLocalFirmware, selectedFirmware } = useFirmwareController();

const { selectCustomPath } = useDeviceStateController();
const { localFilename } = useInstallationStore();

const pickCustomFirmware = usePickCustomFirmware();

const isLocalSelected = computed(() =>
  selectedFirmware.value?.source === "local"
);

const parsedFirmwareFilename = computed(() => {
  if (!cachedLocalFirmware.value) {
    return null;
  }

  return parseFirmwareFilename(cachedLocalFirmware.value.path.split('/').filter(Boolean).pop() ?? '')
})

const selectLocalFirmware = async () => {
  if (!cachedLocalFirmware.value) {
    return;
  }

  await selectCustomPath(cachedLocalFirmware.value.path, cachedLocalFirmware.value.version);
}

const selectLocalRadio = useTemplateRef<QRadio>('selectLocalRadio');

const selectLocalRadioElementRef = computed(() => selectLocalRadio.value?.$el as HTMLElement);

const { distances } = useDistanceToElements(selectLocalRadioElementRef, { threshold: 200 });

const colors = computed(() => distances.value?.map((percentage) => colorTween({
  percentage,
  from: getCssVar('primary') ?? '#000',
  to: getCssVar('secondary') ?? '#FFF',
})));

const selectRadioStyle = computed(() => ({
  '--color': colors.value[0],
  '--shadow-color': colors.value[0],
  'color': 'var(--color)',
  'overflow': 'visible',
  'filter': `drop-shadow(0 0 ${(distances.value?.[0] ?? 0) * 7}px var(--shadow-color)`
}));
</script>

<template>
  <div :class="[{ 'no-selection': !cachedLocalFirmware?.path }, 'bg-dark-page item-container q-pl-sm q-pr-lg']">
    <VersionListItem ref-name="selectLocalRadio" :is-selected="isLocalSelected"
      :is-disabled="!cachedLocalFirmware?.path" :radio-value="cachedLocalFirmware?.path"
      :selected-value="selectedFirmware?.path" :show-brackets-on-hover="false" radio-label="Local Firmware File"
      :on-radio-update="selectLocalFirmware" :on-toggle-click="pickCustomFirmware" :radio-style="selectRadioStyle"
      primary-label="Local File"
      :caption-label="cachedLocalFirmware ? (parsedFirmwareFilename?.model ?? 'MODEL:?') : 'Click to select local file'"
      icon-name="drive_folder_upload" :version="cachedLocalFirmware?.version ?? localFilename ?? '?'"
      :show-version-number="!!cachedLocalFirmware" />
  </div>
</template>

<style lang="scss" scoped>
.item-container {
  --shadow-color-rgb: 200, 200, 200;
  border-right: 2px solid transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  transition: 0.1s ease box-shadow, 0.1s ease border, 0.1s ease padding-top, 0.1s ease padding-bottom;

  &:hover.no-selection {
    border-top-color: var(--q-primary);
    box-shadow:
      0px -2px 5px -3px rgba(var(--shadow-color-rgb), 0.1),
      0px -3px 10px 1px rgba(var(--shadow-color-rgb), 0.07),
      0px -1px 14px 2px rgba(var(--shadow-color-rgb), 0.06);
    padding-top: 0.2em;
    padding-bottom: 0.2em;
  }
}
</style>
