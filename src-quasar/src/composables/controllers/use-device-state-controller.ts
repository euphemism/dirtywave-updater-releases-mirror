import { registerIpcEventListener } from "src/utils";
import { useInstallationStore } from "src/stores/installation";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import type { DeviceStateUpdate } from "src/types";
import type { LogEntry } from "src/types/installation";
import { parseFirmwareFilename } from "src/utils/filename-parsing";

let unlisten: null | (() => void) = null;
let listenersStarted = false;

export const useDeviceStateController = () => {
  const installationStore = useInstallationStore();

  const serialStore = useSerialPortInfoStore();

  function handleDeviceStateUpdate(payload: DeviceStateUpdate) {
    console.log("handleDeviceStateUpdate", JSON.stringify(payload));

    const state = payload.state;

    switch (state.kind) {
      case "Disconnected": {
        serialStore.device = null;
        installationStore.uploadState = "Stopped";
        break;
      }

      case "Ready": {
        serialStore.device = state.device;
        installationStore.uploadState = "Stopped";
        break;
      }

      case "Downloading": {
        serialStore.device = state.device;
        installationStore.downloadStatus = state.status;

        installationStore.uploadLog.push({
          line: `Downloading... ${(installationStore.downloadProgress * 100).toFixed(2)}%`,
          state: "Starting",
        });
        break;
      }

      case "Uploading": {
        serialStore.device = state.device;

        if (state.status.log) {
          const logs: LogEntry[] = [];
          const outputRegex = /(?:^\s*upload@\S+)(?:\s+)(?<log>.*$)/gm;
          let line;
          while (null != (line = outputRegex.exec(state.status.log)?.groups?.["log"])) {
            logs.push({ line, state: state.status.state });
          }
          installationStore.uploadLog.push(...logs);
        }

        installationStore.uploadState =
          state.status.state === "Error" ? "Stopped" : state.status.state;

        if (
          state.status.state === "Starting" &&
          installationStore.downloadStatus.state === "Complete"
        ) {
          installationStore.downloadStatus.state = "Stopped";
        }
        break;
      }

      case "Error": {
        serialStore.device = state.device;
        installationStore.uploadState = "Stopped";
        installationStore.uploadLog.push({
          line: state.message,
          state: "Error",
        });
        break;
      }
    }
  }

  async function startListeners() {
    if (listenersStarted) return;

    unlisten = await registerIpcEventListener(
      "device-state-update",
      handleDeviceStateUpdate,
    );

    listenersStarted = true;
  }

  async function selectCustomPath(path: string, version?: string | null) {
    const parsedVersion = version ?? parseFirmwareFilename(path)?.version;
    if (!parsedVersion) return;

    await installationStore.selectVersion({
      source: "local",
      version: parsedVersion,
      path,
    });
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        unlisten?.();
      } catch {
        /* noop */
      }
      unlisten = null;
      listenersStarted = false;
    });
  }

  return {
    startListeners,
    selectCustomPath,
  } as const;
}
