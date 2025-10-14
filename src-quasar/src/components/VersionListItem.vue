<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { QRadio } from 'quasar';
import VersionNumber from 'components/VersionNumber.vue';

type Props = {
  refName: string;
  isSelected: boolean;
  isDisabled?: boolean;
  radioValue: string | undefined;
  selectedValue: string | undefined; // Add this to track what's actually selected
  radioLabel?: string;
  onRadioUpdate: () => void;
  onToggleClick: () => void;
  radioStyle: Record<string, string | undefined>;
  toggleDisabled?: boolean;
  toggleAriaLabel?: string;
  primaryLabel: string;
  captionLabel: string;
  showBracketsOnHover?: boolean;
  showIcon?: boolean;
  iconName?: string;
  version?: string;
  showVersionNumber?: boolean;
}

const {
  isDisabled = false,
  toggleDisabled = false,
  showIcon = true,
  iconName = 'arrow_drop_down',
  showBracketsOnHover = true,
  showVersionNumber = true,
  ...props
} = defineProps<Props>();

const radioRef = useTemplateRef<QRadio>(props.refName);

defineExpose({
  radioRef
});
</script>

<template>
  <q-item :class="[
    { 'hover-brackets': showBracketsOnHover, 'version-selected': isSelected },
    'bg-dark-page column firmware relative-position q-pa-none q-py-xs'
  ]">
    <q-item-section class="bg-dark-page column full-width items-stretch justify-start version-header">
      <div class="items-center row justify-between">
        <div class="col-auto">
          <q-radio :ref="refName" :model-value="selectedValue" @update:model-value="onRadioUpdate"
            :color="isSelected ? 'accent' : undefined" :disable="isDisabled" :label="radioLabel" :val="radioValue"
            checked-icon="task_alt" keep-color :class="[{ 'invisible': isDisabled }, 'select-button']"
            :style="radioStyle" />
        </div>

        <div class="col items-center justify-between row version-header-info">
          <q-btn @click="onToggleClick" color="dark-page" :aria-label="toggleAriaLabel" :ripple="false" unelevated
            :class="[
              { 'no-changelog': toggleDisabled },
              'col full-width q-px-none text-no-wrap toggle'
            ]">
            <div class="col-sm-auto col-xs-12 full-width items-center justify-between row">
              <div class="column items-start">
                <q-item-label class="text-primary">
                  {{ primaryLabel }}
                  <span v-if="showVersionNumber && version" class="teext-caption">
                    <VersionNumber :selected="isSelected" :version="version" style="font-size: unset" />
                  </span>
                </q-item-label>

                <q-item-label caption>
                  {{ captionLabel }}
                </q-item-label>
              </div>

              <div v-if="showIcon" :class="[{ 'invisible': toggleDisabled }, 'col-auto']" style="width: 1.715em">
                <q-icon color="primary" :name="iconName" :size="iconName.includes('folder') ? '1em' : undefined" />
              </div>
            </div>
          </q-btn>
        </div>
      </div>
    </q-item-section>

    <slot name="content" />

    <div class="absolute-full bracket-helper no-pointer-events" />
  </q-item>
</template>


<style lang="scss" scoped>
@use '/node_modules/quasar/dist/quasar.css';

.changelog-border {
  --border-color: var(--q-primary);
  border-left: 1px dashed var(--border-color);
  bottom: 0.5em;
  left: 1.33em;
  top: 5em;
  transition: 0.25s ease all;
  width: 1px;
}

.firmware {
  & ::v-deep(.q-radio__label) {
    @extend .hidden;
  }

  &.q-item {
    border: 1px solid $dark-page;
    box-sizing: border-box;

    & .toggle {
      background: $dark-page;
      text-transform: unset;

      &.no-changelog {
        pointer-events: none;
      }

      &:hover {

        & ::v-deep(.q-focus-helper) {
          opacity: 0;
        }
      }
    }

    &:hover.hover-brackets {
      --bracket-offset: -1px;
      --bracket-size: 0.5rem;

      &::before,
      &::after {
        content: '';
        position: absolute;
        width: var(--bracket-size);
        height: var(--bracket-size);
        border: 1px solid var(--q-primary);
        z-index: 2;
      }

      &::before {
        top: var(--bracket-offset);
        left: var(--bracket-offset);
        border-width: 1px 0 0 1px;
      }

      &::after {
        bottom: var(--bracket-offset);
        right: var(--bracket-offset);
        border-width: 0 1px 1px 0;
      }

      & .bracket-helper {

        &::before,
        &::after {
          content: '';
          position: absolute;
          width: var(--bracket-size);
          height: var(--bracket-size);
          border: 1px solid var(--q-primary);
          z-index: 2;
        }

        &::before {
          top: var(--bracket-offset);
          right: var(--bracket-offset);
          border-width: 1px 1px 0 0;
        }

        &::after {
          bottom: var(--bracket-offset);
          left: var(--bracket-offset);
          border-width: 0 0 1px 1px;
        }

        z-index: 2;
      }

      & .changelog-border {
        --border-color: var(--q-secondary);
        transition: 0.25s ease all;
      }
    }
  }
}

.select-button {
  &:hover {
    --shadow-color: var(--q-accent) !important;
    color: var(--q-accent) !important;
    // font-size: 4rem;

    & ::v-deep(.q-radio__inner) {
      color: var(--q-accent);
    }
  }

  & ::v-deep(.q-radio__inner) {
    color: var(--color);
  }
}

.version-header {
  position: sticky;
  top: 0;
  z-index: 1;

  &-info {
    background: $dark-page;
  }
}
</style>
