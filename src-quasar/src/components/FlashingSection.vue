<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watchEffect, } from 'vue';
import { storeToRefs } from 'pinia';
import { useSerialPortInfoStore } from 'src/stores/serial-port-info';
import { useInstallationStore } from 'src/stores/installation';
import { getCssVar } from 'quasar';
import { useDistanceToElements } from 'src/composables';
import { colorTween } from 'src/utils';
import ChromeBar from 'components/ChromeBar.vue';
import SelectedVersion from 'components/SelectedVersion.vue';
import { TransitionPresets, useTransition } from '@vueuse/core';
import { useAuxiliaryViews } from 'src/composables/use-auxiliary-views';
import UploadFirmwareButton from 'components/UploadFirmwareButton.vue';

const emit = defineEmits<{
  flash: []
}>();

// const $q = useQuasar();

const { downloadProgress, downloadStatus, installationStatus, isFlashing, selectedFirmware, uploadState } = storeToRefs(useInstallationStore());

const downloadProgressIsIndeterminate = computed(() => downloadProgress.value === -1 || uploadState.value !== 'Stopped');

const tweenedDownloadProgress
  = useTransition(downloadProgress, {
    duration
      : 300, // TODO: Do we want to tween this bar? Is this the right duration if so?
    transition
      : TransitionPresets.easeInOutCubic
    ,
  })

const { deviceCount, selectedDevice } = storeToRefs(useSerialPortInfoStore());

const { showTroubleshooting, toggleTroubleshooting } = useAuxiliaryViews();

const hideUploadFirmwareButton = ref(false);

const version = computed(() => selectedFirmware.value?.version ?? '------'
);

// const isFlashing = computed(() => downloadStatus.value.state !== 'Stopped' || uploadState.value !== 'Stopped');
onMounted(() => {
  console.log('device count:', deviceCount.value);

  console.log('selected device:', JSON.stringify(selectedDevice.value));

  console.log('action:', selectedDevice.value?.ty_cmd_info.action);

  console.log('selected firmware:', JSON.stringify(selectedFirmware.value));

  console.log('is flashing:', isFlashing.value);
})

const disableButtons = computed(() =>
  deviceCount.value === 0
  || !selectedDevice.value
  || ['miss', 'remove'].includes(selectedDevice.value.ty_cmd_info.action)
  || !selectedFirmware.value
  || installationStatus.value === 'uploading'
);

watchEffect(() => {
  console.log('download state', downloadStatus.value?.state);
  console.log('upload state', uploadState.value);
});

const showTroubleshootingButton = computed(() => deviceCount.value === 0);

const statusText = computed(() => {
  if (downloadStatus.value.state !== 'Stopped') {
    switch (downloadStatus.value.state) {
      case 'Complete': {
        return 'Download complete'
      }

      case 'Downloading': {
        return 'Downloading'
      }

      case 'Error': {
        return 'Download error'
      }

      case 'Starting': {
        return 'Download start'
      }
    }
  }

  switch (uploadState.value) {
    case 'Error': {
      return 'Flashing error'
    }

    case 'Finalizing': {
      return 'Finalizing'
    }

    case 'Starting': {
      return 'Flashing starting'
    }

    case 'Uploading': {
      return 'Flashing'
    }
  }

  return '';
})

const secondary = getCssVar('secondary') ?? 'white';

const logAreaRef = useTemplateRef<HTMLDivElement>('logArea');

const logArea = computed(() =>
  logAreaRef.value as HTMLElement ?? null);

const { distances } = useDistanceToElements(logArea, { threshold: 300 });

const color = computed(() => colorTween({
  percentage: distances.value?.[0] ?? 0,
  from: getCssVar('primary') ?? '#000',
  to: secondary
}));

const onUploadFirmwareButtonClick = () => {
  hideUploadFirmwareButton.value = true;

  emit('flash')
}
</script>

<template>
  <ChromeBar position="bottom" shadow-color="#222222"
    :class="[{ 'overflow-hidden': disableButtons }, 'relative-position']">
    <div class="full-width row items-center justify-between q-pl-sm">
      <div class="no-pointer-events non-selectable text-caption">
        <div v-if="downloadStatus.state !== 'Stopped'">{{ statusText }}</div>

        <div v-else class="item-center q-gutter-x-xs row">
          <div>Selected:</div>

          <div>
            <SelectedVersion :selected-version="version" class="col-auto self-end" />
          </div>
        </div>
      </div>

      <div class="q-gutter-x-xs q-mr-xs row self-stretch">
        <Transition appear enter-active-class="animated pulse-shadow-negative-once zoomIn"
          leave-active-class="animated fadeOut">
          <div v-show="showTroubleshootingButton">
            <div :class="{ 'pulse-shadow-negative': !showTroubleshooting }">
              <q-btn @click="toggleTroubleshooting" color="negative" icon="help" size="xs" dense flat round>
                <q-tooltip>Troubleshooting</q-tooltip>
              </q-btn>
            </div>
          </div>
        </Transition>

        <div class="relative-position">
          <Transition @after-leave="hideUploadFirmwareButton = false" appear enter-active-class="animated fadeIn"
            leave-active-class="animated fadeOut">
            <!-- <div v-if="installationStatus === 'uploading'" class="fit relative-position self-stretch"> -->
            <div v-if="installationStatus === 'uploading'"
              class="absolute-center color-cycle items-center justify-center row">
              <q-spinner-dots size="2em" />
            </div>
            <!-- </div> -->
          </Transition>

          <UploadFirmwareButton @upload="onUploadFirmwareButtonClick" :disable="disableButtons"
            :hide="hideUploadFirmwareButton" />
          <!-- <Transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut" mode="out-in">
            <div v-if="installationStatus === 'uploading'" class="fit relative-position self-stretch"
              style="min-width: 9ch">
              <div class="absolute-center color-cycle items-center justify-center row">
                <q-spinner-dots size="2em" />
              </div>
            </div>

            <UploadFirmwareButton v-else-if="installationStatus === 'stopped'" @upload="onUploadFirmwareButtonClick" />
          </Transition> -->
        </div>
      </div>
    </div>

    <div class="absolute-full no-pointer-events non-selectable items-start row progress-indicator">
      <div class="full-width items-center justify-center progress-container row">
        <q-linear-progress v-if="isFlashing" :indeterminate="downloadProgressIsIndeterminate"
          :value="tweenedDownloadProgress" track-color="dark-page" instant-feedback
          :class="{ invisible: (downloadStatus.state === 'Stopped' && uploadState === 'Stopped') }"
          style="font-size: 1px" />
      </div>
    </div>
  </ChromeBar>
</template>

<style lang="scss" scoped>
// @use '../css/quasar.variables.scss' as *;
// @use 'sass:color';

.pulse-shadow {
  // animation: pulse-shadow 3s infinite;
}

.pulse-shadow-negative {
  // animation: pulse-shadow-negative 3s infinite;
}

.pulse-shadow-negative-once {
  animation: pulse-shadow-negative 3s 1;
}

// .animated.fadeOut .pulse-shadow-negative {
//   animation: none !important;
// }

::v-deep(.animated.fadeOut .pulse-shadow-negative) {
  animation-play-state: paused;
}

// @debug $primary;

// $colors: (
//   primary: $primary,
//   secondary: $secondary,
//   accent: $accent,
//   negative: $negative,
//   positive: $positive
// );

// @each $name, $color in $colors {
//   @keyframes pulse-shadow-#{$name} {
//     0% {
//       filter: drop-shadow(0 0 0px #{$color}) drop-shadow(0 0 0px #{$color}) drop-shadow(0 0 0px #{$color});
//     }

//     50% {
//       filter: drop-shadow(0 0 24px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0.1)) drop-shadow(0 0 24px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0.1)) drop-shadow(0 0 24px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0.5));
//     }

//     100% {
//       filter: drop-shadow(0 0 6px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0)) drop-shadow(0 0 12px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0)) drop-shadow(0 0 24px rgba(#{color.channel($color, "red", $space: rgb)},
//           #{color.channel($color, "green", $space: rgb)},
//           #{color.channel($color, "blue", $space: rgb)},
//           0));
//     }
//   }

//   .pulse-shadow-#{$name} {
//     animation: pulse-shadow-#{$name} 3s infinite;
//   }
// }

// Usage: <div class="pulse-shadow-primary">...</div>

@keyframes pulse-shadow {
  0% {
    filter: drop-shadow(0 0 0px var(--q-primary)) drop-shadow(0 0 0px var(--q-primary)) drop-shadow(0 0 0px var(--q-primary));
  }

  50% {
    filter: drop-shadow(0 0 24px rgba(0, 229, 255, 0.1)) drop-shadow(0 0 24px rgba(0, 229, 255, 0.1)) drop-shadow(0 0 24px rgba(0, 229, 255, 0.5));
  }

  100% {
    filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0)) drop-shadow(0 0 12px rgba(0, 229, 255, 0)) drop-shadow(0 0 24px rgba(0, 229, 255, 0));
  }
}

@keyframes pulse-shadow-negative {
  0% {
    filter: drop-shadow(0 0 0px var(--q-negative)) drop-shadow(0 0 0px var(--q-negative)) drop-shadow(0 0 0px var(--q-negative));
  }

  50% {
    filter: drop-shadow(0 0 24px rgba(233, 30, 99, 0.1)) drop-shadow(0 0 24px rgba(233, 30, 99, 0.5)) drop-shadow(0 0 24px rgba(233, 30, 99, 0.1));
  }

  100% {
    filter: drop-shadow(0 0 24px rgba(233, 30, 99, 0)) drop-shadow(0 0 12px rgba(233, 30, 99, 0)) drop-shadow(0 0 6px rgba(233, 30, 99, 0));
  }
}

// .shadow-color {
//   --chrome-bar-shadow-color-rgb: #{color.channel($shadow-color, "red", $space: rgb)},
//   #{color.channel($shadow-color, "green", $space: rgb)},
//   #{color.channel($shadow-color, "blue", $space: rgb)};
// }

// The QBar component has some odd CSS selection that ends up targeting the
// progress indicator, applying 8px of left margin. Need to clear that.
.q-bar>.progress-indicator {
  margin-left: 0;
}

.selected-version-container {
  --width: 14ch;
  max-width: var(--width);
  min-width: var(--width);
  width: var(--width);
}

// .synthdrums-image-spacer {
//   background-image: url("src/assets/DW01_synthdrums.jpg");
//   background-position-x: 1ch;
//   background-position-y: 22%;
//   background-repeat: no-repeat;
//   background-size: 327px; // Magic number; full width of element before transition to wide layout // cover;

//   /* Apply a masking gradient */
//   // -webkit-mask-image: linear-gradient(to right, black, transparent);
//   mask-image: linear-gradient(to left, black 0%, rgba(0, 0, 0, 0.3) 45%, transparent 90%);

//   /* Ensure the mask covers the entire element */
//   // -webkit-mask-size: 100% 100%;
//   mask-size: 100% 100%;
//   // -webkit-mask-repeat: no-repeat;
//   mask-repeat: no-repeat;

//   // transform: translateX(2px); // translateY(2px);

//   border: 1px solid v-bind(color)
// }

.tycmd-log-area {
  --log-height: 8.25rem;
  --log-width: 255px;
  // flex-basis: var(--log-width);
  max-height: var(--log-height);

  // body.screen--xs & {
  flex-basis: var(--log-height);
  // }

  // .border {
  //   border-top: 1px dashed var(--q-primary);
  // }
}

.tycmd-log-container {
  --border-color: v-bind(color);
  border-bottom: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
  border-bottom-left-radius: 0.5rem;
  // border: 1px solid white;
  // border-bottom: 1px dashed rgba(255, 255, 255, 0.3);
  // border-top: 1px dashed rgba(255, 255, 255, 0.3);
  // flex-basis: var(--log-width);


  // min-height: var(--log-height);

  // body.screen--xs & {
  //   flex-basis: var(--log-height);
  // }
}
</style>
