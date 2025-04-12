<script setup lang="ts">
import type { QBtnProps } from 'quasar';

const { disable, hide = false } = defineProps<{ hide?: boolean } & Pick<QBtnProps, 'disable' | 'onClick'>>();

const emit = defineEmits<{ upload: [] }>();
</script>

<template>
  <q-btn @click="emit('upload')" :color="disable ? 'grey-4' : 'primary'" :disable="disable" size="sm" dense flat
    :class="[{ 'hide': hide, 'pulse-shadow': !disable }, 'upload-firmware-button q-pl-sm']">

    <div class="items-center no-wrap q-gutter-x-xs row">
      <div>Upload</div>


      <q-icon v-if="disable" name="remove_circle_outline" style="transform: translateY(-1px)" />

      <q-icon v-else name="keyboard_double_arrow_up" />
      <!-- <div class="items-center justify-center relative-position row">
        <div v-show="disable">
          <q-icon name="remove_circle_outline" style="transform: translateY(-1px)" />
        </div>
      </div> -->
    </div>
  </q-btn>
</template>

<style lang="scss" scoped>
.upload-firmware-button {
  // https://css-irl.info/animating-underlines/
  background:
    linear-gradient(to bottom, transparent, transparent),
    linear-gradient(to bottom, var(--q-primary), var(--q-primary));
  background-size: 0.1em 100%, 0.1em 0;
  background-position: 0 0, 0 0;
  background-repeat: no-repeat;
  opacity: 1;
  transition: 200ms ease background-size 500ms ease opacity;

  ::v-deep(.q-icon) {
    filter: drop-shadow(0 0 4px transparent);
    transition: 0.5s ease color, 0.5s ease filter, 0.25s ease transform;
  }

  // &.disabled {
  //   ::v-deep(.q-icon) {
  //     opacity: 0;
  //   }
  // }

  &.hide {
    opacity: 0 !important;
  }

  &.q-hoverable:hover {
    ::v-deep(.q-icon) {
      transform: translateY(-0.125em);
      transition: 0.5s ease color, 0.5s ease filter, 0.25s ease transform !important;
    }
  }
}

.upload-firmware-button.q-hoverable {
  &:hover {
    background-size: 0.1em 0, 0.1em 100%;

    ::v-deep(.q-focus-helper) {
      background: transparent;

      &::after {
        opacity: 0;
      }
    }

    ::v-deep(.q-icon) {
      transition: 0.5s ease color, 0.5s ease filter;
      color: var(--q-accent);
      filter: drop-shadow(0 0 6px var(--q-accent));
    }
  }
}
</style>
