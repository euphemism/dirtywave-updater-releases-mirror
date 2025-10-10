<script lang="ts" setup>
import AuxiliaryPage from 'components/AuxiliaryPage.vue';
import TroubleshootingContent from 'components/TroubleshootingContent.vue';

const emit = defineEmits<{
  'close': []
}>();
</script>

<template>
  <AuxiliaryPage @close="emit('close')" title="Troubleshooting">
    <q-scroll-area class="fit">
      <TroubleshootingContent class="q-pr-md" />
    </q-scroll-area>
  </AuxiliaryPage>
</template>

<style lang="scss" scoped>
.close-button-container {
  padding-right: 0.1em;
}
</style>
