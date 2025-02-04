<template>
  <q-page class="row items-center justify-evenly">
    <div class="full-width q-pb-md q-pl-md q-pt-md row self-stretch q-gutter-sm">
      <div class="col-auto column">
        <div>
          <q-btn @click="enumerateSerialPorts" color="dark" label="Enumerate M8 Serial Ports" text-color="primary"
            unelevated />
        </div>

        <q-separator class="q-mt-md q-mb-sm" />

        <q-list>
          <q-item v-for="port in ports" :key="port.port_name">
            <q-item-section>
              <q-item-label class="text-primary">{{ port.port_name }}</q-item-label>

              <q-item-label caption>Manufacturer: {{ port.port_type.UsbPort.manufacturer }}</q-item-label>
              <q-item-label caption>Product: {{ port.port_type.UsbPort.product }}</q-item-label>
              <q-item-label caption>Serial Number: {{ port.port_type.UsbPort.serial_number }}</q-item-label>
              <q-item-label caption>VID: {{ port.port_type.UsbPort.vid }}</q-item-label>
              <q-item-label caption>PID: {{ port.port_type.UsbPort.pid }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col">
        <q-scroll-area class="fit q-pr-md">
          <VersionList :firmwares="firmwares" />
        </q-scroll-area>
      </div>

      <q-space />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useFirmwareList } from 'src/composables/use-firmware-list';
import VersionList from 'src/components/VersionList.vue';

// import { useQuasar } from 'quasar';

// const $q = useQuasar();

type PortType = {
  UsbPort: {
    vid: number;
    pid: number;
    serial_number: string;
    manufacturer: string;
    product: string;
  };
};

type Port = {
  port_name: string;
  port_type: PortType;
};

const ports = ref<Port[]>([]);

const enumerateSerialPorts = async () => {
  const result: Port[] = await invoke('enumerate_serial_ports');

  ports.value = result;
}

const { fetchFirmwareList, firmwares } = useFirmwareList();

onMounted(async () => {
  await fetchFirmwareList();
});
</script>
