<template>
  <span class="version-number" ref="version" :style="{ color: selected ? 'var(--q-accent)' : color }">
    {{ version }}
  </span>
</template>

<script lang="ts" setup>
import { getCssVar } from 'quasar';
import { useDistanceToElements } from 'src/composables';
import { colorTween } from 'src/utils';
import { computed, useTemplateRef } from 'vue';

defineProps<{ selected?: boolean; version: string }>();

const versionSpan = useTemplateRef<HTMLSpanElement>('version');

const { distances } = useDistanceToElements(versionSpan, { threshold: 400 });

const color = computed(() => colorTween({
  percentage: distances.value?.[0] ?? 0,
  from: getCssVar('primary') ?? '#000',
  to: getCssVar('secondary') ?? '#FFF',
}));
</script>

<style lang="scss" scoped>
.version-number {
  transition: color 0.2s;

  &:hover {
    color: var(--q-accent);
  }
}
</style>
