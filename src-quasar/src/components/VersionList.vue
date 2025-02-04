<script setup lang="ts">
import type { ChangelogEntry, Firmware } from 'src/types';
import { defineProps, ref } from 'vue';

const props = defineProps<{
  firmwares: Firmware[];
}>();

const expansionModel = ref(Array(props.firmwares.length).fill(false));

const typeColors: Record<ChangelogEntry['type'], string> = {
  change: 'deep-purple-11',
  fix: 'amber-14',
  improved: 'teal-13',
  new: 'light-green-13',
}
</script>

<template>
  <q-list class="firmware-list">
    <q-item v-for="(firmware, i) in firmwares" :key="firmware.version" ref="versions"
      class="column firmware relative-position q-pa-none">
      <div class="absolute-full bracket-helper" />

      <q-item-section class="bg-dark-page column full-width items-stretch justify-start q-px-sm q-py-xs version-header">
        <div class="items-center row justify-between">
          <div>
            <q-item-label class="text-primary"><span>Version </span><span class="stealth-57-font"
                style="font-size: 0.75rem">{{ firmware.version
                }}</span></q-item-label>

            <q-item-label caption>{{ firmware.date }}</q-item-label>
          </div>

          <div class="row q-gutter-md">
            <div v-if="firmware.changelog[0]?.entries?.length">
              <q-btn @click="() => expansionModel[i] = !expansionModel[i]" color="dark"
                :label="expansionModel[i] ? 'hide changes' : 'show changes'" size="sm" text-color="primary"
                unelevated />
            </div>

            <div>
              <q-btn color="dark" label="Select" size="sm" text-color="primary" outline unelevated />
            </div>
          </div>
        </div>
      </q-item-section>

      <div v-if="expansionModel[i]" class="q-px-sm">
        <q-separator class="q-mb-xs" />

        <q-item-section>
          <q-item-label class="stealth-57-font text-uppercase">Changelog</q-item-label>
        </q-item-section>

        <q-item-section v-for="section in firmware.changelog" :key="section.id">
          <q-item-label v-if="section.title" caption>{{ section.title }}</q-item-label>

          <ul>
            <li v-for="entry in section.entries" :key="entry.description" class="entry">
              <div class="column">
                <div>
                  <span><q-badge :color="typeColors[entry.type]" :label="entry.type" text-color="dark"
                      class="stealth-57-font text-weight-bold" /></span> {{
                        entry.description
                      }}
                </div>

                <ul v-if="(entry.details?.length ?? 0) > 0">
                  <li v-for="detail in entry.details" :key="detail"
                    :class="`indented-entry-${entry.type} q-ml-lg q-pl-sm`">
                    {{ detail }}
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </q-item-section>
      </div>
    </q-item>
  </q-list>
</template>

<style lang="scss" scoped>
.firmware-list {
  & .firmware.q-item {
    border: 1px solid transparent;

    &:hover {
      --bracket-size: 0.5rem;

      border: 1px solid transparent;

      &::before,
      &::after {
        content: '';
        position: absolute;
        width: var(--bracket-size);
        height: var(--bracket-size);
        border: 1px solid var(--q-primary);
      }

      &::before {
        top: -1px;
        left: -1px;
        border-width: 1px 0 0 1px;
      }

      &::after {
        bottom: -1px;
        right: -1px;
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
        }

        &::before {
          top: -1px;
          right: -1px;
          border-width: 1px 1px 0 0;
        }

        &::after {
          bottom: -1px;
          left: -1px;
          border-width: 0 0 1px 1px;
        }

        z-index: -1;
      }
    }
  }
}

.indented-entry {
  &-change {
    border-left: 1px solid $deep-purple-11;
  }

  &-fix {
    border-left: 1px solid $amber-14;
  }

  &-improved {
    border-left: 1px solid $teal-13;
  }

  &-new {
    border-left: 1px solid $light-green-13;
  }
}

.version-header {
  background: $dark-page;
  margin-bottom: 2px;
  margin-top: 2px;
  position: sticky;
  top: 0;
}
</style>
