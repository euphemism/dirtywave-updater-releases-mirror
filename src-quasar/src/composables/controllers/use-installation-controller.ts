import { registerIpcEventListener } from "src/utils";
import { isFlashingDownloadStatus } from "src/types";
import type { LogEntry } from "src/types/installation";
import type { IpcEventPayloads } from "src/types";
import { useInstallationStore } from "src/stores/installation";
import { parseFirmwareFilename } from "src/utils/filename-parsing";

let unlistenFlashing: null | (() => void) = null;
let flashingListenersStarted = false;

export function useInstallationController() {
  const installationStore = useInstallationStore();

  function handleFlashingStatus(payload: IpcEventPayloads["flashing-status"]) {
    console.log('handleFlashingStatus', JSON.stringify(payload));

    if (isFlashingDownloadStatus(payload)) {
      const status = payload.status.Downloading;

      if (status.state === "Complete") {
        installationStore.downloadStatus = status;
      }

      installationStore.uploadLog[installationStore.uploadLog.length - 1] = {
        line: `Downloading... ${(installationStore.downloadProgress * 100).toFixed(2)}%`,
        state: "Starting",
      };
    } else {
      const status = payload.status.Uploading;

      if (status.log) {
        const logs: LogEntry[] = [];

        const outputRegex = /(?:^\s*upload@\S+)(?:\s+)(?<log>.*$)/gm;

        let line;

        while (null != (line = outputRegex.exec(status.log)?.groups?.["log"])) {
          logs.push({ line, state: status.state });
        }

        installationStore.uploadLog.push(...logs);
      }

      installationStore.uploadState =
        status.state === "Error" ? "Stopped" : status.state;

      if (status.state === 'Starting' && installationStore.downloadStatus.state === 'Complete') {
        installationStore.downloadStatus.state = "Stopped";
      }
    }
  }

  async function startListeners() {
    if (flashingListenersStarted) {
      return;
    }

    unlistenFlashing = await registerIpcEventListener(
      "flashing-status",
      handleFlashingStatus,
    );

    flashingListenersStarted = true;
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        unlistenFlashing?.();
      } catch {
        /* noop */
      }
      unlistenFlashing = null;
      flashingListenersStarted = false;
    });
  }

  async function selectCustomPath(path: string, version?: string | null) {
    const parsedVersion = version ?? parseFirmwareFilename(path)?.version;

    if (!parsedVersion) {
      return
    }

    await installationStore.selectVersion({
      source: "local",
      version: parsedVersion,
      path,
    });
  }

  return {
    startListeners,
    selectCustomPath,
  } as const;
}
