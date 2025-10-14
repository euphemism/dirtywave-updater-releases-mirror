<script setup lang="ts">
import { QFile } from 'quasar';
import { useDragDropListener } from 'src/composables/use-drag-drop-listener';
import { computed, ref, watch } from 'vue';
// import { open } from '@tauri-apps/plugin-dialog';
import { useDeviceStateController } from 'src/composables/controllers/use-device-state-controller';
import { parseFirmwareFilename } from 'src/utils/filename-parsing';


const selectedFiles = ref<File[]>();

const { paths } = useDragDropListener();
const { selectCustomPath } = useDeviceStateController();


const parsedFirmwareFilename = computed(() => {
  if (!paths.value[0]) {
    return null
  }

  const parsed = parseFirmwareFilename(paths.value[0].name)

  return `${parsed?.version} - ${parsed?.model}`
})

watch(selectedFiles, async () => {
  if ((selectedFiles.value?.length ?? 0) > 0) {
    const file = selectedFiles.value?.[0];
    const parsed = parseFirmwareFilename(file?.name ?? '');
    await selectCustomPath(file?.name ?? '', parsed?.version ?? null);
  }
})

// const pickCustomFile = async () => {
//   const selected = await open({
//     multiple: false,
//     directory: false,
//     filters: [
//       { name: 'Firmware', extensions: ['hex', 'zip'] },
//     ],
//   });

//   if (typeof selected === 'string' && selected.length > 0) {
//     await selectCustomPath(selected);
//   }
// }
</script>

<template>
  <q-file v-model="selectedFiles" label="Select Firmware" dense>
    <template #file>
      <div class="full-width">{{ parsedFirmwareFilename }}</div>
    </template>
  </q-file>
  <!-- <section class="column fit rounded-borders uploader-container">
    <div class="col-auto">
      <q-file v-model="selectedFiles" label="Outlined" name="firmware-upload" label-slot multiple outlined
        class="firmware-upload">
        <q-btn @click="pickCustomFile()" color="primary" no-caps outline class="add-button col-12">
          <span class="q-my-none text-caption">Click or Drop to Add M8 Binaries (<span
              class="glow-accent text-accent">.hex</span>)
          </span>
        </q-btn>

        <template #label>
          <label for="firmware-upload" class="invisible">Upload Firmware Binary</label>
        </template>

<template #selected />
</q-file>
</div>

<q-scroll-area class="col firmware-list">
  <q-list class="q-gutter-xs q-pa-none q-px-none">
    <q-item v-for="file in paths" :key="file.path" class="file-entry items-center justify-center q-pa-none row">

      <h4 class="text-monospace text-no-wrap text-caption q-my-none">{{ file.name }}</h4>
    </q-item>
  </q-list>
</q-scroll-area>
</section>

<Transition enter-active-class="animated appear fadeIn" leave-active-class="animated fadeOut">
  <Teleport v-if="maybePaths.length > 0" to="#overlay">
    <section class="bg-aero column fit items-center justify-center z-max">
      <div class="col column file-drop-zone fit q-pa-md">
        <div class="col column file-drop-zone-content q-py-md rounded-borders">
          <div class="col column items-center justify-center">
            <div class="relative-position">
              <q-icon color="accent" name="add_circle_outline" size="5rem" class="glow-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </Teleport>
</Transition> -->
</template>

<style lang="scss" scoped>
.add-button {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  border: none;
}

.file-drop-zone {

  &-content {
    border: 1px dashed var(--q-accent);
  }
}

.file-entry {
  &.q-item {
    min-height: unset;
  }
}

.firmware-list {
  border: 1px solid var(--q-primary);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  border-top: none;
}

.firmware-upload {
  ::v-deep(.q-field__control) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    padding: 0px;
  }

  ::v-deep(.q-field__control-container) {
    padding: 0px;
  }
}

.uploader-container {
  // border: 1px dashed var(--q-primary);

  transition: border-color ease 0.25s;
}
</style>
