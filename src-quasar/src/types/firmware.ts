export type ChangelogEntry = {
	description: string;
	type: "change" | "fix" | "improved" | "new";
	details?: string[];
};

export type ChangelogSection = {
	entries: ChangelogEntry[];
	id: number;
	title?: string;
};

export type FirmwareMetadata = {
	path: string;
	version: string;
};

export type Firmware = FirmwareMetadata & {
	changelog?: ChangelogSection[];
	date?: string;
};

export type FirmwareSansRealizedFileInfo = Omit<Firmware, 'path' | 'size'>;

export const changelogEntryTypeColors: Record<ChangelogEntry["type"], string> =
	{
		change: "purple-12",
		fix: "amber-14",
		improved: "teal-13",
		new: "light-green-13",
	};
