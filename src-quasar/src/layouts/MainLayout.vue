<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="bg-dark non-selectable q-pa-none text-primary">

      <q-toolbar class="q-pa-none">
        <div class=" fit items-stretch row">
          <div class="col-auto">
            <q-btn @click="toggleLeftDrawer" aria-label="Menu" icon="menu" dense flat class="q-px-xs" />
          </div>

          <div class="col items-center relative-position row">
            <div class="col-auto no-wrap q-ml-sm">
              <q-toolbar-title class="stealth-57-font text-subtitle2">
                Dirt Loader
              </q-toolbar-title>
            </div>

            <div data-tauri-drag-region class="absolute-full" />
          </div>

          <div class="column col-auto items-center justify-center">
            <q-btn @click="closeWindow" label="X" ref="closeButton" text-color="primary" dense flat
              class="q-px-md stealth-57-font" />
          </div>
        </div>
      </q-toolbar>

    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered />

    <q-page-container>
      <router-view />
    </q-page-container>

    <div class="absolute-full frame" />
  </q-layout>
</template>

<script setup lang="ts">
import type { Window } from '@tauri-apps/api/window';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onMounted, ref } from 'vue';

const leftDrawerOpen = ref(false);

const appWindow = ref<Window | null>(null);

onMounted(() => {
  appWindow.value = getCurrentWindow();
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const closeWindow = () => appWindow.value?.close();
</script>

<style lang="scss" scoped>
.frame {
  border: 1px solid var(--q-primary);
  pointer-events: none;
  z-index: 3000;
}
</style>
