import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

import { useInstallationStore } from "src/stores/installation";
import type { IpcEventPayloads } from "src/types";

let registeredCallback:
	| ((payload: IpcEventPayloads["flashing-status"]) => void)
	| null = null;

vi.mock("src/utils", () => ({
	registerIpcEventListener: vi.fn(
		(
			_event: "flashing-status",
			cb: (payload: IpcEventPayloads["flashing-status"]) => void,
		) => {
			registeredCallback = cb;
			return () => {
				/* noop */
			};
		},
	),
}));

describe("useInstallationController", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		registeredCallback = null;
		vi.resetModules();
	});

	it("updates download status during Downloading and sets Stopped on Complete", async () => {
		const { useInstallationController } = await import(
			"src/composables/controllers/use-installation-controller"
		);
		const { startListeners } = useInstallationController();
		await startListeners();

		const store = useInstallationStore();

		// Downloading in progress
		const p1: IpcEventPayloads["flashing-status"] = {
			cycle: "Downloading",
			status: {
				Downloading: {
					bytes_downloaded: 50,
					log: null,
					size: 100,
					state: "Downloading",
				},
			},
		};
		registeredCallback!(p1);

		expect(store.downloadStatus).toEqual({
			bytes_downloaded: 50,
			size: 100,
			state: "Downloading",
			log: null,
		});

		// Complete => should be normalized to Stopped
		const p2: IpcEventPayloads["flashing-status"] = {
			cycle: "Downloading",
			status: {
				Downloading: {
					bytes_downloaded: 100,
					log: null,
					size: 100,
					state: "Complete",
				},
			},
		};
		registeredCallback!(p2);

		expect(store.downloadStatus).toEqual({
			bytes_downloaded: 100,
			size: 100,
			state: "Stopped",
			log: null,
		});
	});

	it("parses upload logs and updates upload state (Error -> Stopped)", async () => {
		const { useInstallationController } = await import(
			"src/composables/controllers/use-installation-controller"
		);
		const { startListeners } = useInstallationController();
		await startListeners();

		const store = useInstallationStore();

		const up1: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: {
				Uploading: {
					log: "upload@abc First line\nfoo\n  bar\nupload@abc Second line",
					state: "Starting",
				},
			},
		};
		registeredCallback!(up1);

		// Two upload@ lines parsed
		expect(store.uploadLog.length).toBeGreaterThanOrEqual(2);
		expect(store.uploadLog[0]?.line).toMatch(/First line/);
		expect(store.uploadLog[1]?.line).toMatch(/Second line/);
		expect(store.uploadState).toBe("Starting");

		// Error maps to Stopped
		const up2: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: {
				Uploading: {
					log: null,
					state: "Error",
				},
			},
		};
		registeredCallback!(up2);

		expect(store.uploadState).toBe("Stopped");
	});

	it("passes through non-error upload states", async () => {
		const { useInstallationController } = await import(
			"src/composables/controllers/use-installation-controller"
		);
		const { startListeners } = useInstallationController();
		await startListeners();

		const store = useInstallationStore();

		const s1: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: { Uploading: { log: null, state: "Starting" } },
		};
		registeredCallback!(s1);
		expect(store.uploadState).toBe("Starting");

		const s2: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: { Uploading: { log: null, state: "Uploading" } },
		};
		registeredCallback!(s2);
		expect(store.uploadState).toBe("Uploading");

		const s3: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: { Uploading: { log: null, state: "Finalizing" } },
		};
		registeredCallback!(s3);
		expect(store.uploadState).toBe("Finalizing");
	});

	it("ignores upload logs without upload@ prefix", async () => {
		const { useInstallationController } = await import(
			"src/composables/controllers/use-installation-controller"
		);
		const { startListeners } = useInstallationController();
		await startListeners();

		const store = useInstallationStore();

		const p: IpcEventPayloads["flashing-status"] = {
			cycle: "Uploading",
			status: {
				Uploading: {
					log: "some line without the prefix\n another line",
					state: "Uploading",
				},
			},
		};
		registeredCallback!(p);

		expect(store.uploadLog.length).toBe(0);
	});
});
