import type { ChangelogEntry, ChangelogSection, Firmware } from 'src/types';

import { ref } from 'vue';

const changelogUrl = 'https://api.github.com/repos/Dirtywave/M8Firmware/contents/changelog.txt';

const entryRegex = /((Fix|Improved|New):) (.*)$/;
const versionHeaderRegex = /^\d{4}-\d\d-\d\d - Version/;

export const parseVersion = (versionBlob: string[]): Firmware => {
	let sectionId = 0;

	const [header, ...changelogLines] = versionBlob;

	if (!header || !changelogLines) {
		throw new Error('parseVersion: Failed to parse firmware version information (header or changelog lines missing)');
	}

	const [date, version] = header.split(' - ');

	if (!date || !version) {
		throw new Error('parseVersion: Failed to parse firmware version information (date or version missing)');
	}

	const changelog: ChangelogSection[] = [];

	let currentEntry: ChangelogEntry | null = null;

	let currentSection: ChangelogSection = {
		entries: [],
		id: sectionId++,
	};

	changelogLines.forEach((line) => {
		// This is a nested detail line
		if (line.startsWith('-   ')) {
			if (currentEntry) {
				currentEntry.details = currentEntry.details || [];

				currentEntry.details.push(line.replace('-   ', ''));
			}
		} else if (line.startsWith('- ')) {
			if (currentEntry) {
				currentSection.entries.push(currentEntry);
			}

			// Generalize special case for lines starting with '- Fix from ... '
			if (line.startsWith('- Fix from ')) {
				currentEntry = {
					description: line.replace('- Fix ', ''),
					type: 'fix',
				};
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const [_, __, rawType, description] = entryRegex.exec(line.replace('- ', '')) ?? [];

				if (!rawType || !description) {
					currentEntry = {
						description: line.replace('- ', ''),
						type: 'change',
					};
				} else {
					const type = rawType.toLowerCase();

					currentEntry = {
						description,
						type: type === 'fix' ? 'fix' : type === 'improved' ? 'improved' : type === 'new' ? 'new' : 'change',
					};
				}
			}
		} else {
			changelog.push(currentSection);

			currentSection = {
				entries: [],
				id: sectionId++,
				title: line,
			};
		}
	});

	return {
		date,
		changelog,
		version: version.replace('Version ', ''),
	};
};

export const parseChangelog = (changelog: string): Firmware[] => {
	const versionBlobs: string[][] = [];

	changelog.split('\n').forEach((line) => {
		if (versionHeaderRegex.test(line)) {
			versionBlobs.push([]);
		}

		versionBlobs[versionBlobs.length - 1]?.push(line);
	});

	return versionBlobs.map(parseVersion);
};

export const useFirmwareList = () => {
	const firmwares = ref<Firmware[]>([]);

	const fetchFirmwareList = async () => {
		try {
			const response = await fetch(changelogUrl, {
				headers: {
					Accept: 'application/vnd.github.raw+json',
					'X-GitHub-Api-Version': '2022-11-28',
				},
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			const changelog = await response.text();

			firmwares.value = parseChangelog(changelog);
		} catch (error) {
			console.error('Failed to fetch firmware list:', error);

			throw error;
		}
	};

	return {
		fetchFirmwareList,
		firmwares,
	};
};
