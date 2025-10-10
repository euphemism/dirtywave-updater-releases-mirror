import { emitTo } from "@tauri-apps/api/event";

import { useFirmwareStore } from 'src/stores/firmware';
import { useInstallationStore } from "src/stores/installation";
import { useSerialPortInfoStore } from "src/stores/serial-port-info";
import { defineBoot } from "#q-app/wrappers";
import { useDragDropListener } from "src/composables/use-drag-drop-listener";
import { watch } from "vue";
import { useInstallationController } from "src/composables/controllers/use-installation-controller";
import { useDevicesController } from "src/composables/controllers/use-devices-controller";
import { Notify } from "quasar";
import { denySync } from "@tauri-store/pinia";
import { attachConsole } from "@tauri-apps/plugin-log";

export default defineBoot(async () => {
  try {
  await attachConsole();
  } catch (e) {
    console.error('No!', e)
  }

	const installationStore = useInstallationStore();

	try {
		await installationStore.$tauri.start();
	} catch (e) {
		console.error("Failed to start installation store", e);
		Notify.create({
			type: "negative",
			message: "Failed to start installation store",
		});
	}

	const store = useSerialPortInfoStore();

	try {
		await store.$tauri.start();
	} catch (e) {
		console.error("Failed to start serial port info store", e);
		Notify.create({
			type: "negative",
			message: "Failed to start serial device listeners",
		});
	}

  try {
    await useFirmwareStore().$tauri.start();
  } catch (e) {
		console.error("Failed to start firmware store", e);

    // Notify.create({
		// 	type: "negative",
		// 	message: "Failed to start serial device listeners",
		// });
	}

  await denySync('installation', 'firmware', 'serial-port-info');

	const { paths } = useDragDropListener();

	const installationController = useInstallationController();

		async function handleDeepLinks(urls: string[] | null | undefined) {
			if (!urls || urls.length === 0) return;
			for (const u of urls) {
				try {
					const url = new URL(u);
					if (url.protocol !== 'dw:') continue;
					// expected: dw://open?path=/absolute/path/to/file.hex
					const path = url.searchParams.get('path');

					if (path) {
						await installationController.selectCustomPath(path, null);

						Notify.create({ type: 'positive', message: 'Custom firmware selected from deep link' });
					} else {
						console.warn('Deep link missing path query parameter:', u);
					}
				} catch (e) {
					console.error('Failed to handle deep link', u, e);
				}
			}
		}


	const devicesController = useDevicesController();

	watch(paths, async () => {
		if (paths.value.length > 0 && paths.value[0]) {
			await installationController.selectCustomPath(paths.value[0].path, null);
		}
	});

	try {
		await installationController.startListeners();
	} catch (e) {
		console.error("Failed to start installation listeners", e);
    throw e;
	}

	try {
		await devicesController.startListeners();
	} catch (e) {
		console.error("Failed to start device listeners", e);
	}

		// Deep link handling (dw://open?path=/path/to/file.hex)
		try {
      console.log('deep link');
			const startUrls: string[] = []; // await getCurrent();
			await handleDeepLinks(startUrls ?? undefined);
			// await onOpenUrl(async (urls: string[]) => {
			// 	await handleDeepLinks(urls);
			// });
		} catch (e) {
			console.error('Failed to initialize deep link listeners', e);
		}


	try {
		await emitTo("main", "frontend-loaded");
	} catch (e) {
		console.error("Failed to emit frontend-loaded event", e);
	}
});
