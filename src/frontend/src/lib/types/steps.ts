import type { ProgressStep } from '@dfinity/gix-components';

export interface StaticStep extends ProgressStep {
	progressLabel?: string;
}
