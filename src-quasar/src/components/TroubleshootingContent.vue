<script lang="ts" setup>
import { ref } from 'vue';

type HelpSection = { content: string; header: string; };

type HelpCategory = { defaultOpened?: boolean; heading: string, sections: HelpSection[] };

const categories: HelpCategory[] = [
  {
    defaultOpened: false,
    heading: 'M8 is unresponsive after firmware update attempt',
    sections: [
      {
        content: 'Hold the power button for 10 seconds to ensure the M8 is powered off.',
        header: ''
      },
      {
        content: 'Use a known good data USB cable (such as the one that came with your M8) and connect the M8 to your computer. If at all possible, avoid connecting to a USB Hub.',
        header: ''
      },
      {
        content: 'Open Dirtywave Updater',
        header: ''
      },
      {
        content: "Turn on the M8 by holding the power button for 2 seconds.  Depending on your M8's state, it will likely not make any sound, and the screen may also remain blank with or without the backlight illuminated.",
        header: ''
      },
      {
        content: "Using a small tool such as a SIM ejector key or paperclip, press and release the internal reset button inside the hole on the backside of the M8 once.",
        header: ''
      },
      {
        content: 'Wait about 10 seconds and the Upload button in Dirtywave Updater should be enabled',
        header: ''
      },
      {
        content: 'Select firmware and click Upload. It may take 10-20 seconds to update, and once it has completed, your M8 will reboot. You should now see the new firmware version appear at the bottom left corner of the Song screen for a few seconds',
        header: ''
      }
    ]
  },
  {
    defaultOpened: false,
    heading: "M8 is not being detected",
    sections: [
      {
        content: 'Many cables, especially cheap or free ones, lack data lines and are power-only. Try another cable; if possible, use the cable the M8 came with - it is a black, braided cable with the Dirtywave logo molded into the ends.',
        header: 'Check the USB cable'
      },
    ]
  },
]

const categoriesHidingStates = ref(
  Array.from({ length: categories.length }, (_, i) => categories[i]?.defaultOpened ?? false)
);
</script>

<template>
  <section id="help-section" class="slower">
    <q-expansion-item v-for="({ defaultOpened, heading, sections }, i) in categories"
      @after-hide="() => categoriesHidingStates[i] = false" @before-hide="() => categoriesHidingStates[i] = true"
      :default-opened="defaultOpened ?? false" :duration="150" :key="heading" group="help"
      :header-class="[{ 'bg-aero': categoriesHidingStates[i] }, 'header']" dense expand-separator hide-expand-icon>
      <template #header="{ expanded }">
        <h3 :class="['text-subtitle2 q-my-none q-px-none non-selectable', { 'text-primary': expanded }]">
          {{ heading }}
        </h3>
      </template>

      <ol class="q-my-none q-pl-sm">
        <li v-for="{ content, header } in sections" :key="header" class="suggestion">
          <div>
            <dt class="text-bold">{{ header }}</dt>

            <dd class="q-pl-sm">{{ content }}</dd>
          </div>
        </li>
      </ol>
    </q-expansion-item>
  </section>
</template>

<style lang="scss" scoped>
@use "sass:map";

dd {
  margin-inline-start: 0;
}

#help-section {
  & ::v-deep(.q-item) {
    padding-left: 0.25em;
    padding-right: 0;
  }

  & ::v-deep(li) {
    margin: map.get($space-md, "y") 0px;
  }
}


.bg-aero {
  @extend .bg-blur;
  @extend .bg-translucent-grey;
}

.bg-blur {
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.bg-translucent-grey {
  background-color: rgba(32, 32, 32, 0.4);
}

::v-deep(.header) {
  position: sticky;
  top: 0;
  z-index: 1;

  &.q-item {
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.2);
  }
}

.q-expansion-item.q-expansion-item--expanded {
  ::v-deep(.q-item) {
    @extend .bg-aero;
  }
}

.suggestion {
  list-style-position: inside;
}
</style>
