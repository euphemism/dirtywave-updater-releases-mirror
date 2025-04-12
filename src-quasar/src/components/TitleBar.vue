<script lang="ts" setup>
import ChromeBar from 'components/ChromeBar.vue';
import SettingsButton from 'components/SettingsButton.vue';

const emit = defineEmits<{
  'close': [void];
  'settings': [void];
}>();
</script>

<template>
  <ChromeBar>
    <div class="row q-gutter-xs">
      <img src="~assets/icon-transparent-background.svg" height="24px" width="24px" />

      <div class="text-dirty-white text-subtitle2 text-weight-medium">
        Dirtywave Updater
      </div>

      <div data-tauri-drag-region class="absolute-full" />
    </div>

    <q-space />

    <div class="items-center justify-center q-gutter-sm q-mr-xs row">
      <SettingsButton @click.stop="() => {
        console.log('emitting settings click')
        emit('settings')
      }" />

      <div>
        <q-separator vertical class="q-py-sm" />
      </div>

      <q-btn @click="emit('close')" icon="close" ref="closeButton" text-color="negative" dense flat
        class="glow-negative q-ml-xs q-px-xs" />
    </div>
  </ChromeBar>
</template>

<style lang="scss" scoped>
@use '/node_modules/quasar/dist/quasar.css';

.settings-button {
  animation: pingPongColor 4.5s ease-in infinite;

  @keyframes pingPongColor {
    0% {
      filter: drop-shadow(0 0 2px $dirty-white);
      color: $dirty-white;
    }

    50% {
      filter: none; // drop-shadow(0 0 1px var(--q-primary));
      color: var(--q-primary);
    }

    100% {
      filter: drop-shadow(0 0 2px $dirty-white);
      color: $dirty-white;
    }
  }
}

.settings-button-update-hint {
  animation: pingPongOpacity 4.5s ease-in infinite;
  left: 3.5px;
  top: -2.5px;

  @keyframes pingPongOpacity {
    0% {
      opacity: 0;
    }

    50% {
      opacity: 1;
    }

    100% {
      opacity: 0;
    }
  }
}
</style>
