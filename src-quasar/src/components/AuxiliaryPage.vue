<script lang="ts" setup>
import ChromeBar from 'components/ChromeBar.vue';

defineProps<{ title: string }>();

const emit = defineEmits<{
  'close': []
}>();
</script>

<template>
  <section class="column full-height">
    <ChromeBar class="col-auto justify-between q-pl-sm row">
      <div class="no-pointer-events non-selectable">{{ title }}</div>

      <div class="close-button-container q-ma-xs">
        <q-btn @click="emit('close')" color="dirty-white" icon="sym_o_close_small" size="sm" dense flat />
      </div>
    </ChromeBar>

    <div class="bg-aero col q-pr-sm">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.close-button-container {
  padding-right: 0.1em;
}
</style>
