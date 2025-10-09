<script setup lang="ts">
// import { info } from '@tauri-apps/plugin-log';
import { ref, watch } from 'vue';
// import ChromeBar from 'components/ChromeBar.vue';
import FileUploader from 'src/components/FileUploader.vue';
// import FlashingSection from 'src/components/FlashingSection.vue';
import VersionList from 'src/components/VersionList.vue';
// import { storeToRefs } from 'pinia';
// import { useSerialPortInfoStore } from 'src/stores/serial-port-info';
// import { emitTo } from '@tauri-apps/api/event';
// import { useInstallationStore } from 'src/stores/installation';
import { QScrollArea } from 'quasar';
import { useDragDropListener } from 'src/composables/use-drag-drop-listener';
import { useInstallationController } from 'src/composables/controllers/use-installation-controller';
import { parseFirmwareFilename } from 'src/utils/filename-parsing';

// const { /*downloadProgress, downloadStatus, isFlashing,*/ uploadLog, uploadState } = storeToRefs(useInstallationStore());
// const { selectedDevice } = storeToRefs(useSerialPortInfoStore());
const { paths } = useDragDropListener();
const { selectCustomPath } = useInstallationController();

const panel = ref('remote');

watch(paths, async () => {
  if (paths.value[0]?.path) {
    console.log('selecting custom path', paths.value)
    const filename = paths.value[0]?.name;

    const parsed = parseFirmwareFilename(filename);

    await selectCustomPath(paths.value[0]?.path, parsed?.version ?? null);
    // const parsed = parseFirmwareFilename(paths.value[0]?.path);
    // await selectCustomPath(paths.value[0]?.path, parsed?.version);
  }
})
// const downloadFirmware = async () => {
//   uploadLog.value.push({ line: "Downloading...", state: uploadState.value })
//   console.log('selected device is:', JSON.stringify(selectedDevice.value));

//   if (selectedDevice.value) {
//     // await info(['emitting start-firmware-download with', JSON.stringify({ device: selectedDevice.value.ty_cmd_info.tag, }, null, 2)].join(' '));
//     console.log(['emitting start-firmware-download with', JSON.stringify({ device: selectedDevice.value.ty_cmd_info.tag, }, null, 2)].join(' '));

//     await emitTo('main', 'start-firmware-download', { device: selectedDevice.value.ty_cmd_info.tag, });
//   }
// }
</script>

<template>
  <q-page class="row items-center justify-evenly overflow-visible">
    <div class="full-width no-wrap overflow-visible q-pb-none q-pl-none row self-stretch">
      <div class="col column q-gutter-y-sm q-mb-xs q-mt-none q-pb-xs">
        <!-- <ChromeBar class="q-mt-none"
          style="background: #1A1A1A !important; border-bottom: 1px solid black; height: unset">
          <div class="drag-and-drop-button--container fit items-center justify-center row">
            <button
              class="col-auto cursor-pointer drag-and-drop-button q-pa-none q-px-sm text-caption text-dirty-white">
              Click or drag-and-drop to upload local file
            </button>
          </div>
        </ChromeBar> -->
        <!-- <q-tabs class="q-mt-none" dense>
          <q-tab :ripple="false" class="text-lowercase">local</q-tab>

          <q-tab :ripple="false" class="text-lowercase">remote</q-tab>
        </q-tabs> -->

        <q-tab-panels v-model="panel" keep-alive class="bg-transparent col firmwarea fit">
          <q-tab-panel name="local">local</q-tab-panel>

          <q-tab-panel name="remote" class="q-pa-none q-px-sm">
            <Suspense>
              <Transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                <div class="fit column items-stretch">
                  <q-scroll-area class="col q-pr-sm relative-position version-list-scroll-area">
                    <VersionList />
                  </q-scroll-area>
                </div>
              </Transition>

              <!-- <LocalFileSelectItem class="full-width" /> -->

              <template #fallback>
                <Transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                  <section class="full-height row justify-center items-center">
                    <q-img style="max-height: 16rem" :loading-show-delay="500" class="pulse" fit="scale-down"
                      src="~assets/icon-transparent-background.svg" />
                  </section>
                </Transition>
              </template>

              <template #error>
                <div class="text-negative">Failed to load firmware list. You can still select a local file.</div>
              </template>
            </Suspense>


            <!-- <Transition enter-active-class="animated appear fadeIn" leave-active-class="animated fadeOut">
              <div v-if="paths.length > 0" class="absolute-full bg-aero column justify-center q-px-sm">
                <div class="items-center justify-center row" style="border: 1px solid var(--q-primary)">
                  <div class="col text-center">
                    {{ paths[0]?.name ?? '' }}
                  </div>

                  <div class="col-auto">
                    <q-btn @click="clearDragDropPaths" color="accent" icon="close" size="xs" flat />
                  </div>
                </div>
              </div>
            </Transition> -->
          </q-tab-panel>

          <q-tab-panel name="local">
            <FileUploader />
          </q-tab-panel>
        </q-tab-panels>

        <!-- <div class="relative-position">
          <q-separator :class="[{ 'glow-primary': !isFlashing }, 'bg-primary q-my-sm']" />

          <div v-if="isFlashing" class="absolute-full items-center justify-center progress-container row">
            <q-linear-progress track-color="dark-page" :value="downloadProgress"
              :indeterminate="uploadState !== 'Stopped'" instant-feedback
              :class="{ invisible: (downloadStatus.state === 'Stopped' && uploadState === 'Stopped') }"
              style="font-size: 1px" />
          </div>
        </div> -->

        <!-- <FlashingSection @flash="downloadFirmware" /> -->
      </div>
    </div>

    <!-- <div class="absolute bg-aero fit full-width justify-center q-pa-sm row"> -->
    <!-- <div class="absolute fit"> -->
    <!-- <Transition appear enter-active-class="animated slideInUp" leave-active-class="animated slideOutDown">
        <SettingsPage v-show="showSettings" @close="toggleSettings" />
      </Transition> -->

    <!-- <Transition appear enter-active-class="animated slideInUp" leave-active-class="animated slideOutDown">
        <TroubleshootingPage v-show="showTroubleshooting" @close="toggleTroubleshooting" />
      </Transition> -->
    <!-- </div> -->
  </q-page>
</template>

<style>
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>

<style lang="scss" scoped>
::v-deep(.firmware-tab) {
  --size: 2rem;

  height: var(--size);
  max-height: var(--size);
  min-height: var(--size);


  &.left {
    border-top-left-radius: 1rem;
  }

  &.right {
    border-top-right-radius: 1rem;
  }


  &.glow {
    .q-tab__content {
      filter: drop-shadow(0 0 4px currentcolor);
    }

    .q-tab__indicator {
      filter: drop-shadow(0 0 4px currentcolor);
    }
  }

  .q-tab__icon {
    --size: 1em;

    width: var(--size);
    height: var(--size);
    font-size: var(--size);
  }

  .q-tab__indicator {
    height: 1px;
  }

  .q-tab__label {
    font-size: 0.75em;
  }
}

.drag-and-drop-button {
  background: var(--q-dark-page);
  border-left: unset;
  border-top: unset;
  border-right: unset;
  // border-bottom: 1px solid $grey-9;
  border-bottom: unset;
  line-height: unset;
  text-decoration: unset;
  transition: 0.2s ease filter;
  color: $grey-5;

  &--container {
    // border-bottom: 1px solid var(--q-dark-page);
    position: relative;
    // box-shadow:
    //   inset 0px 3px 5px -3px rgba(0, 0, 0, 0.1),
    //   inset 0px 6px 10px -1px rgba(0, 0, 0, 0.07),
    //   inset 0px 1px 14px -2px rgba(0, 0, 0, 0.06),
    //   inset 0px -3px 5px -3px rgba(0, 0, 0, 0.1),
    //   inset 0px -6px 10px -1px rgba(0, 0, 0, 0.07),
    //   inset 0px -1px 14px -2px rgba(0, 0, 0, 0.06);

    &:after {
      background: linear-gradient(0deg, #111111 0%, rgba(20, 20, 20, 0.9) 5%, transparent 30%, transparent 70%, rgba(20, 20, 20, 0.9) 95%, #111111 100%);
      bottom: 0;
      content: '';
      left: 0;
      pointer-events: none;
      position: absolute;
      right: 0;
      top: 0;
    }
  }
}

.q-tab__indicator {
  height: 1px;

  /* Add diagonal cutout stripes using mask */
  -webkit-mask-image: repeating-linear-gradient(45deg,
      rgba(0, 0, 0, 1) 0,
      rgba(0, 0, 0, 1) 10px,
      rgba(0, 0, 0, 0) 10px,
      rgba(0, 0, 0, 0) 20px);
  -webkit-mask-size: 20px 20px;
  mask-image: repeating-linear-gradient(45deg,
      rgba(0, 0, 0, 1) 0,
      rgba(0, 0, 0, 1) 10px,
      rgba(0, 0, 0, 0) 10px,
      rgba(0, 0, 0, 0) 20px);
  mask-size: 20px 20px;

  /* Ensure the mask works across browsers */
  background-color: currentColor;
}

.firmwarea {
  min-height: 8rem;

  ::v-deep(.q-scrollarea__content) {
    padding-right: 10px;
  }
}

.flash-firmware-button {
  border-color: var(--q-primary);
  border-width: 1px;

  &:not(.disabled) {
    border-style: solid;
  }

  border-bottom-left-radius: 7px;
  transform: translateY(0.33em);
}

.progress-container {
  ::v-deep(.q-linear-progress__track) {
    opacity: 1;
  }
}

.pulse {
  animation: pulse 2s ease infinite;
}

.selected-version-container {
  min-width: 28ch;
}

.version-list-scroll-area {

  &::after {
    background: linear-gradient(180deg, rgba($dark-page, 0) 0%, rgba($dark-page, 0.33) 33.33%, rgba($dark-page, 0.66) 66.66%, $dark-page 100%);

    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 75%;
    z-index: 4000;
  }
}

.bg-color-cycle {
  animation: bg-color-cycle 1.5s linear infinite;
}

::v-deep(.q-tab) {
  min-height: unset;

  .q-focus-helper {
    color: transparent;

    &::after {
      background: transparent;
    }
  }

  .q-tab__indicator {
    @extend .bg-color-cycle;
    height: 1px;
    width: 60%;
    left: 20%;

    // &::before {
    //   content: '';
    //   background: white;
    //   height: 4px;
    //   left: 0;
    //   right: 0;
    //   position: absolute;
    //   // filter: blur(20px);
    //   z-index: -1;
    // }
  }
}
</style>
