import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
	useFirmwareList,
	parseVersion,
	parseChangelog,
} from "src/composables/use-firmware-list";
import { useFirmwareStore } from "src/stores/firmware";

// Strongly typed Quasar Notify mock
vi.mock("quasar", () => {
	const create: (opts: { message: string; type?: string }) => void = vi.fn();
	return { Notify: { create } };
});

// Bypass any auth header logic in a typed way
vi.mock("src/utils", () => ({
	buildGitHubApiFetchArgs: vi.fn((url: string) => {
		const init: RequestInit = {};
		return Promise.resolve([url, init] as const);
	}),
}));

describe("useFirmwareList helpers", () => {
	it("parseVersion parses header and entries", () => {
		const blob = [
			"2024-01-01 - Version 1.2.3",
			"Improvements:",
			"- New: Shiny feature",
			"- Fix: Something fixed",
		];
		const fw = parseVersion(blob);
		expect(fw.version).toBe("1.2.3");
		expect(fw.date).toBe("2024-01-01");
		expect(fw.changelog && fw.changelog.length).toBeGreaterThan(0);
	});

	it("parseChangelog splits by version headers", () => {
		const text = [
			"2025-01-01 - Version 2.0.0",
			"Changes:",
			"- New: Feature X",
			"2024-06-01 - Version 1.2.3",
			"Other:",
			"- Fix: Bug Y",
		].join("\n");
		const versions = parseChangelog(text);
		expect(versions[0]?.version).toBe("2.0.0");
		expect(versions[1]?.version).toBe("1.2.3");
	});
});

describe("useFirmwareList fetchFirmwareList", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.stubGlobal("fetch", vi.fn());
	});

	it("merges changelog and metadata and fills latest version from changelog", async () => {
		const changelogText = [
			"2025-01-01 - Version 2.0.0",
			"Changes:",
			"- New: Feature X",
			"2024-06-01 - Version 1.2.3",
			"Other:",
			"- Fix: Bug Y",
		].join("\n");

		const fetchStub =
			vi.fn<
				(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
			>();
		vi.stubGlobal("fetch", fetchStub);
		fetchStub.mockImplementation((input: RequestInfo | URL) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input instanceof Request
							? input.url
							: ((input as { url?: string }).url ?? "");
			if (url.includes("changelog.txt")) {
				return Promise.resolve(
					new Response(changelogText, {
						status: 200,
						headers: { "Content-Type": "text/plain" },
					}),
				);
			}
			if (url.includes("/Releases")) {
				return Promise.resolve(
					new Response(
						JSON.stringify([
							{
								name: "M8Firmware_V1_2_3.zip",
								path: "Releases/M8Firmware_V1_2_3.zip",
								size: 1234,
								type: "file",
							},
						]),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				);
			}
			if (url.endsWith("/M8Firmware.zip")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							name: "M8Firmware.zip",
							path: "M8Firmware.zip",
							size: 2345,
							type: "file",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		const store = useFirmwareStore();
		const { fetchFirmwareList } = useFirmwareList();

		const list = await fetchFirmwareList();

		expect(store.firmwares.length).toBe(2);
		expect(list.map((f) => f.version)).toEqual(["2.0.0", "1.2.3"]);
	});

	it("returns cached list immediately when present", async () => {
		const store = useFirmwareStore();
		store.firmwares = [{ changelog: [], path: 'https://foo.bar/', version: "0.9.0" }];

		const { fetchFirmwareList } = useFirmwareList();

		const result = await fetchFirmwareList();

		expect(result).toEqual(store.firmwares);
	});
});

describe("useFirmwareList negative paths", () => {
	let fetchStub: ReturnType<
		typeof vi.fn<
			(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
		>
	>;
	beforeEach(() => {
		setActivePinia(createPinia());
		fetchStub =
			vi.fn<
				(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
			>();
		vi.stubGlobal("fetch", fetchStub);
	});

	it("not-ok changelog triggers negative Notify (e.g., rate limit) and returns empty list", async () => {
		fetchStub.mockImplementation((input: RequestInfo | URL) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input instanceof Request
							? input.url
							: ((input as { url?: string }).url ?? "");
			if (url.includes("changelog.txt")) {
				return Promise.resolve(
					new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
						status: 429,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			if (url.includes("/Releases")) {
				return Promise.resolve(
					new Response(JSON.stringify([]), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			if (url.endsWith("/M8Firmware.zip")) {
				return Promise.resolve(
					new Response(JSON.stringify({}), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		const { fetchFirmwareList } = useFirmwareList();
		const { Notify } = await import("quasar");
		const mockedCreate = vi.mocked(Notify.create);
		mockedCreate.mockClear();

		const list = await fetchFirmwareList();
		expect(list).toEqual([]);

		expect(mockedCreate).toHaveBeenCalledWith(
			expect.objectContaining({ type: "negative" }),
		);
		const [firstCall] = mockedCreate.mock.calls;
		const [arg0] = firstCall ?? [];
		const message = typeof arg0 === "string" ? arg0 : arg0?.message;
		expect(message).toMatch(/rate limit exceeded/i);
	});

	it("metadata fetch failure triggers negative Notify and returns empty list", async () => {
		const changelogText = [
			"2025-01-01 - Version 2.0.0",
			"Changes:",
			"- New: Feature X",
		].join("\n");

		fetchStub.mockImplementation((input: RequestInfo | URL) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input instanceof Request
							? input.url
							: ((input as { url?: string }).url ?? "");
			if (url.includes("changelog.txt")) {
				return Promise.resolve(
					new Response(changelogText, {
						status: 200,
						headers: { "Content-Type": "text/plain" },
					}),
				);
			}
			if (url.includes("/Releases")) {
				return Promise.reject(new Error("network"));
			}
			if (url.endsWith("/M8Firmware.zip")) {
				return Promise.resolve(
					new Response(JSON.stringify({}), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify({}), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		const { fetchFirmwareList } = useFirmwareList();
		const { Notify } = await import("quasar");
		const mockedCreate = vi.mocked(Notify.create);
		mockedCreate.mockClear();

		const list = await fetchFirmwareList();
		expect(list).toEqual([]);

		expect(mockedCreate).toHaveBeenCalledWith(
			expect.objectContaining({ type: "negative" }),
		);
		const [firstCall] = mockedCreate.mock.calls;
		const [arg0] = firstCall ?? [];
		const message = typeof arg0 === "string" ? arg0 : arg0?.message;
		expect(message).toBe("Failed to fetch and parse firmware data");
	});
});
