export type ChangelogEntry = {
	description: string;
	type: 'change' | 'fix' | 'improved' | 'new';
	details?: string[];
};

export type ChangelogSection = {
	entries: ChangelogEntry[];
	id: number;
	title?: string;
};

export type Firmware = {
	date: string;
	version: string;
	changelog: ChangelogSection[];
};
