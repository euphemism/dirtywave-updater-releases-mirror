import { emitTo } from "@tauri-apps/api/event";
import { sep } from "@tauri-apps/api/path";
import { acceptHMRUpdate, defineStore, storeToRefs } from "pinia";
import { useFirmwareStore } from "src/stores/firmware";
import type { DownloadStatus, Firmware, UploadState } from "src/types";
import type { LogEntry } from "src/types/installation";

export type FirmwareSource = "local" | "remote";

export type SelectedFirmware = {
  path: string;
  version: string | null;
  source: FirmwareSource;
};

type InstallationStoreState = {
  cachedLocalFirmware: SelectedFirmware | null;
  downloadStatus: Omit<DownloadStatus, "log">;
  selectedFirmware: SelectedFirmware | null;
  uploadLog: LogEntry[];
  uploadState: UploadState;
};

export type InstallationStatus = 'stopped' | 'uploading'; // | 'upload-disabled';

type InstallationStoreKey = "installation";

export const useInstallationStore = defineStore<
  InstallationStoreKey,
  InstallationStoreState,
  {
    downloadProgress: (state: InstallationStoreState) => number;
    isFlashing: (state: InstallationStoreState) => boolean;
    installationStatus: (state: InstallationStoreState) => InstallationStatus;
    localFilename: (state: InstallationStoreState) => string | null;
    selectedFirmwareEntry: (state: InstallationStoreState) => Firmware | undefined;
    selectedFirmwareDownloadLink: (
      state: InstallationStoreState,
    ) => string | null;
  },
  {
    selectVersion: (args: {
      path: string;
      version: string;
      source: FirmwareSource;
    }) => Promise<void>;
  }
>("installation", {
  state: () => ({
    cachedLocalFirmware: null,
    downloadStatus: {
      bytes_downloaded: 0,
      size: 0,
      state: "Stopped",
    },
    selectedFirmware: null,
    uploadLog: [],
    uploadState: "Stopped",
  }),
  getters: {
    downloadProgress: (state) => state.downloadStatus.size === 0
      ? -1
      : state.downloadStatus.bytes_downloaded / state.downloadStatus.size,
    isFlashing: (state) =>
      state.downloadStatus.state !== "Stopped" ||
      state.uploadState !== "Stopped",
    installationStatus: (state) => {
      if (state.downloadStatus.state !== 'Stopped' || state.uploadState !== 'Stopped') {
        return 'uploading';
      }

      return 'stopped';
    },
    localFilename: (state) => {
      if (!state.cachedLocalFirmware?.path) {
        return null;
      }

      return state.cachedLocalFirmware.path.split(sep()).pop() ?? '';
    },
    selectedFirmwareEntry: (state) => {
      const { firmwares } = storeToRefs(useFirmwareStore());
      if (!state.selectedFirmware) return undefined;
      return firmwares.value.find((f) => f.version === state.selectedFirmware?.version);
    },
    selectedFirmwareDownloadLink: (state) => {
      if (!state.selectedFirmware) {
        return null;
      }

      const { path, source } = state.selectedFirmware;

      if (source === 'local') {
        return path;
      }

      return `https://api.github.com/repos/Dirtywave/M8Firmware/contents/${path}`;
    },
  },
  actions: {
    async selectVersion({ path, version, source }) {
      // const firmwareSource: FirmwareSource =
      //   source ??
      //   (/^https?:\/\//.test(path) ? "remote" : "local");
      this.selectedFirmware = { path, source, version };

      if (source === 'local') {
        this.cachedLocalFirmware = { path, source, version };
      }

      const resolvedPath = this.selectedFirmwareDownloadLink;

      console.log('emitting version-selected', { path: resolvedPath, version });

      await emitTo("main", "version-selected", { path: resolvedPath, version });
    },
  },
  tauri: {
    save: false,
    saveOnChange: false,
    sync: false,
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useInstallationStore, import.meta.hot),
  );
}
