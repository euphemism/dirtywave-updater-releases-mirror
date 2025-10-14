import type { UploadState } from 'src/types/events';

export type LogEntry = {
	line: string;
	state: UploadState;
};
