import { onKeyStroke } from "@vueuse/core";
import { ref } from "vue";

const showSettings = ref(false);

const showTroubleshooting = ref(false);

export const useAuxiliaryViews = () => {
  onKeyStroke('Escape', () => {
    if (showSettings.value) {
      showSettings.value = false;
    }

    if (showTroubleshooting.value) {
      showTroubleshooting.value = false;
    }
  })

  return {
    showSettings,
    showTroubleshooting,
    toggleSettings: () => {
      showSettings.value = !showSettings.value;

      if (showTroubleshooting.value) {
        showTroubleshooting.value = false;
      }
    },
    toggleTroubleshooting: () => {
      showTroubleshooting.value = !showTroubleshooting.value;

      if (showSettings.value) {
        showSettings.value = false;
      }
    },
  };
};
