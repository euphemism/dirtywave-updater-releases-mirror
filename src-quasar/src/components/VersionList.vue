<script setup lang="ts">

import { useDistanceToElements } from 'src/composables';
import type { QRadio } from 'quasar';
import { getCssVar } from 'quasar';
import {
  computed, ref, useTemplateRef, watch, /* , onMounted */
  watchEffect
} from 'vue';
import { colorTween } from 'src/utils';
// import VersionNumber from 'components/VersionNumber.vue';
import VersionListItem from 'components/VersionListItem.vue';
import { Notify } from 'quasar';
import ChangelogSectionContent from './ChangelogSectionContent.vue';
// import { parseFirmwareFilename } from 'src/utils/filename-parsing';
import { useFirmwareController } from 'src/composables/controllers/use-firmware-controller';
import { useDragDropListener } from 'src/composables/use-drag-drop-listener';
// import { usePickCustomFirmware } from 'src/composables/use-pick-custom-firmware';
// import { useInstallationController } from 'src/composables/controllers/use-installation-controller';
// import { useInstallationStore } from 'src/stores/installation';

const { selectedFirmware, selectVersion, entries, fetchFirmwareList } = useFirmwareController();

// const { selectCustomPath } = useInstallationController();
// const { localFilename } = useInstallationStore();

const { paths } = useDragDropListener();

// const pickCustomFirmware = usePickCustomFirmware();

// const isLocalSelected = computed(() =>
//   selectedFirmware.value?.source === "local"
// );

// const parsedFirmwareFilename = computed(() => {
//   if (!cachedLocalFirmware.value) {
//     return null;
//   }

//   return parseFirmwareFilename(cachedLocalFirmware.value.path.split('/').filter(Boolean).pop() ?? '')
// })

const isSelected = (version: string | null, path?: string) =>
  selectedFirmware.value?.version === version &&
  (path ? selectedFirmware.value?.path === path : true);

// onMounted(async () => {
try {
  await fetchFirmwareList();
} catch (e) {
  console.error('Failed to load firmware list', e);

  Notify.create({ type: 'negative', message: 'Failed to load firmware list. You can still select a local file.' });
}
// });


const selectLocalRadio = useTemplateRef<QRadio>('selectLocalRadio');
const selectRadios = useTemplateRef<QRadio[]>('selectRadios');

// Fix: Target the actual radio elements, not the component root
const selectRadioElements = computed(() => {
  const elements: HTMLElement[] = [];

  // Get the local radio element
  if (selectLocalRadio.value?.$el) {
    const radioEl = selectLocalRadio.value.$el.querySelector('.q-radio') as HTMLElement;
    if (radioEl) elements.push(radioEl);
  }

  // Get the remote radio elements
  if (selectRadios.value) {
    selectRadios.value.forEach(radio => {
      if (radio?.$el) {
        const radioEl = radio.$el.querySelector('.q-radio') as HTMLElement;
        if (radioEl) elements.push(radioEl);
      }
    });
  }

  return elements;
});

// const selectLocalRadio = useTemplateRef<QRadio>('selectLocalRadio');

// const selectRadios = useTemplateRef<QRadio[]>('selectRadios');

// const selectRadioElements = computed(() =>
//   [selectLocalRadio.value?.$el as HTMLElement, ...(selectRadios.value?.map((radio) => (radio?.$el as HTMLElement) ?? null).filter(el => el) ?? [])]);

const { distances } = useDistanceToElements(selectRadioElements, { threshold: 200 });

const colors = computed(() => distances.value?.map((percentage) => colorTween({
  percentage,
  from: getCssVar('primary') ?? '#000',
  to: getCssVar('secondary') ?? '#FFF',
})));

const expansionModel = ref<boolean[]>(Array(entries.value.length).fill(false));

const showLocalFirmwareSelection = ref(false);

// const selectLocalFirmware = async () => {
//   if (!cachedLocalFirmware.value) {
//     return;
//   }

//   await selectCustomPath(cachedLocalFirmware.value.path, cachedLocalFirmware.value.version);
// }

watchEffect(() => {
  if (paths.value[0]) {
    showLocalFirmwareSelection.value = true;
  }
})

watch(entries, (list) => {
  expansionModel.value = Array(list.length).fill(false);
});

const selectRadioStyle = (i: number) => ({
  '--color': colors.value[i + 1],
  '--shadow-color': colors.value[i + 1],
  'color': 'var(--color)',
  'overflow': 'visible',
  'filter': `drop-shadow(0 0 ${(distances.value?.[i] ?? 0) * 7}px var(--shadow-color)`
})
</script>

<template>
  <q-list class="firmware-list">
    <!-- <VersionListItem ref-name="selectLocalRadio" :is-selected="isLocalSelected"
      :is-disabled="!cachedLocalFirmware?.path" :radio-value="cachedLocalFirmware?.path"
      :selected-value="selectedFirmware?.path" radio-label="Local Firmware File" :on-radio-update="selectLocalFirmware"
      :on-toggle-click="pickCustomFirmware" :radio-style="selectRadioStyle(0)" primary-label="Local File"
      :caption-label="cachedLocalFirmware ? (parsedFirmwareFilename?.model ?? 'MODEL:?') : 'Click to select local file'"
      icon-name="drive_folder_upload" :version="cachedLocalFirmware?.version ?? localFilename ?? '?'"
      :show-version-number="!!cachedLocalFirmware" /> -->

    <!-- Remote Firmware Items -->
    <VersionListItem v-for="({ changelog, date, path, version }, i) in entries" :key="version" ref="selectRadios"
      ref-name="selectRadios" :is-selected="isSelected(version, path)" :is-disabled="!Boolean(path)" :radio-value="path"
      :selected-value="selectedFirmware?.path" :radio-label="version"
      :on-radio-update="() => selectVersion({ path, source: 'remote', version })"
      :on-toggle-click="() => expansionModel[i] = !expansionModel[i]" :radio-style="selectRadioStyle(i)"
      :toggle-disabled="!Boolean(changelog?.[0]?.entries?.length)"
      :toggle-aria-label="expansionModel[i] ? 'hide changes' : 'show changes'" primary-label="Version"
      :caption-label="date ?? '-'" :icon-name="expansionModel[i] ? 'arrow_drop_up' : 'arrow_drop_down'"
      :version="version" :show-icon="Boolean(changelog?.[0]?.entries?.length)">
      <template #content>
        <div v-if="expansionModel[i]" class="q-pl-lg q-pr-sm">
          <q-item-section>
            <q-item-label caption class="text-uppercase text-dirty-white">Changelog</q-item-label>
          </q-item-section>

          <q-item-section v-for="section in changelog" :key="section.id">
            <q-item-label v-if="section.title" caption>{{ section.title }}</q-item-label>
            <ChangelogSectionContent :section="section" />
          </q-item-section>

          <div class="absolute changelog-border" />
        </div>
      </template>
    </VersionListItem>
  </q-list>
</template>

<style lang="scss" scoped>
@use '/node_modules/quasar/dist/quasar.css';

.changelog-border {
  --border-color: var(--q-primary);
  border-left: 1px dashed var(--border-color);
  bottom: 0.5em;
  left: 1.33em;
  top: 5em;
  transition: 0.25s ease all;
  width: 1px;
}

.firmware-list {
  & ::v-deep(.q-radio__label) {
    @extend .hidden;
  }

  & .firmware.q-item {
    border: 1px solid $dark-page;
    box-sizing: border-box;

    & .toggle {
      background: $dark-page;
      text-transform: unset;

      &.no-changelog {
        pointer-events: none;
      }

      &:hover {

        & ::v-deep(.q-focus-helper) {
          opacity: 0;
        }
      }
    }

    &:hover {
      --bracket-offset: -1px;
      --bracket-size: 0.5rem;

      &::before,
      &::after {
        content: '';
        position: absolute;
        width: var(--bracket-size);
        height: var(--bracket-size);
        border: 1px solid var(--q-primary);
        z-index: 2;
      }

      &::before {
        top: var(--bracket-offset);
        left: var(--bracket-offset);
        border-width: 1px 0 0 1px;
      }

      &::after {
        bottom: var(--bracket-offset);
        right: var(--bracket-offset);
        border-width: 0 1px 1px 0;
      }

      & .bracket-helper {

        &::before,
        &::after {
          content: '';
          position: absolute;
          width: var(--bracket-size);
          height: var(--bracket-size);
          border: 1px solid var(--q-primary);
          z-index: 2;
        }

        &::before {
          top: var(--bracket-offset);
          right: var(--bracket-offset);
          border-width: 1px 1px 0 0;
        }

        &::after {
          bottom: var(--bracket-offset);
          left: var(--bracket-offset);
          border-width: 0 0 1px 1px;
        }

        z-index: 2;
      }

      & .changelog-border {
        --border-color: var(--q-secondary);
        transition: 0.25s ease all;
      }
    }
  }
}

.select-button {
  &:hover {
    --shadow-color: var(--q-accent) !important;
    color: var(--q-accent) !important;
    font-size: 4rem;

    & ::v-deep(.q-radio__inner) {
      color: var(--q-accent);
    }
  }

  & ::v-deep(.q-radio__inner) {
    color: var(--color);
  }
}

.version-header {
  position: sticky;
  top: 0;
  z-index: 1;

  &-info {
    background: $dark-page;
  }
}
</style>
