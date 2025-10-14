<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { storeToRefs } from 'pinia';
import { useAuxiliaryViews } from 'src/composables/use-auxiliary-views';
import { useInstallationStore } from 'src/stores/installation';
import { useSerialPortInfoStore } from 'src/stores/serial-port-info';
import DragDropIndicator from 'src/components/DragDropIndicator.vue';
import FlashingSection from 'components/FlashingSection.vue';
import LocalFileSelectItem from 'components/LocalFileSelectItem.vue';
import SettingsPage from 'src/components/SettingsPage.vue';
import TitleBar from 'components/TitleBar.vue';
import TroubleshootingPage from 'src/components/TroubleshootingPage.vue';
import TycmdLog from 'components/TycmdLog.vue';
import type { Window } from '@tauri-apps/api/window';

const { showSettings, showTroubleshooting, toggleSettings, toggleTroubleshooting } = useAuxiliaryViews();

const { downloadStatus, uploadLog, uploadState } = storeToRefs(useInstallationStore());
const isFlashing = computed(() => downloadStatus.value.state !== 'Stopped' || uploadState.value !== 'Stopped');

const { deviceConnected } = storeToRefs(useSerialPortInfoStore());
const appWindow = ref<Window | null>(null);
const version = ref<string>('');

onMounted(async () => {
  appWindow.value = getCurrentWindow();

  version.value = await getVersion();
})

const closeWindow = () => appWindow.value?.close();

const uploadLogRef = useTemplateRef<InstanceType<typeof TycmdLog>>('uploadLogRef');

const downloadFirmware = async () => {
  uploadLog.value.push({ line: "Downloading...", state: uploadState.value })

  if (deviceConnected.value) {
    await emitTo('main', 'start-firmware-download', {});
    // console.log((['emitting start-firmware-download with', JSON.stringify({ device: selectedDevice.value.ty_cmd_info.tag, }, null, 2)].join(' ')));
    // await emitTo('main', 'start-firmware-download', { device: selectedDevice.value.ty_cmd_info.tag, });
  }
}
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="layout">
    <q-header v-if="true" class="bg-dark non-selectable q-pa-none text-primary">
      <TitleBar @close="closeWindow" @settings="toggleSettings" :version />
    </q-header>

    <q-page-container class="overflow-visible">
      <router-view />

      <!-- Hardcoded padding comes from needing to counteract the padding at top of .q-page-container that Quasar applies via style  -->
      <div class="absolute-full no-pointer-events z-top" id="overlay" style="padding-top: 32px;" />

    </q-page-container>



    <q-footer class="bg-transparent">
      <LocalFileSelectItem />

      <Transition enter-active-class="animated slideInUp" leave-active-class="animated slideOutDown">

        <div v-if="showSettings || showTroubleshooting" class="fixed-full z-top" style="bottom: 32px; top: 32px">
          <SettingsPage v-show="showSettings" @close="toggleSettings" />

          <TroubleshootingPage v-show="showTroubleshooting" @close="toggleTroubleshooting" />
        </div>
      </Transition>

      <Transition appear enter-active-class="animated slideInUp">
        <q-expansion-item v-show="uploadLog.length > 0" @after-show="uploadLogRef?.scrollToBottom()"
          :expand-separator="false" header-style="min-height: unset" icon="terminal" label="Flashing Log" dense
          dense-toggle :class="[{ 'active': isFlashing }, 'bg-dark flashing-log-container']">
          <template #header>
            <div class="col-shrink full-width items-center justify-start q-py-none row text-caption text-dirty-white"
              style="height: 1em">
              <div class="full-width items-center q-gutter-x-xs row title">
                <div class="full-width row q-gutter-x-xs">
                  <div class="col-auto">Upload Log</div>

                  <q-separator vertical class="q-my-xs" />

                  <div class="col ellipsis commit-mono text-white" style="font-size: 0.8em">
                    {{ uploadLog.at(-1)?.line }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div ref="logArea" class="column tycmd-log-area wrap">
            <div class="border invisible " />

            <div class="col relative-position">
              <TycmdLog ref="uploadLogRef" :entries="uploadLog" />
            </div>

            <div class="border invisible" />
          </div>
        </q-expansion-item>
      </Transition>

      <FlashingSection @flash="downloadFirmware" class="z-top" />
    </q-footer>

    <DragDropIndicator />
  </q-layout>
</template>

<style lang="scss" scoped>
.flashing-log-container {
  ::v-deep(.q-item) {
    padding-left: 0;
    padding-right: 0;

    .q-icon {
      font-size: 1.25em;
    }

    .q-item__section--side {
      padding-right: 0.5em;
    }
  }

  .title {
    padding-left: 0.25em;
  }
}

.tycmd-log-area {
  --log-height: 8.25rem;
  --log-width: 255px;
  flex-basis: var(--log-height);
  max-height: var(--log-height);
  min-height: var(--log-height);
}
</style>
