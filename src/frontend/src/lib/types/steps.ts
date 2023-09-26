import type { ProgressStep, ProgressStepState } from '@dfinity/gix-components';

export interface StaticStep extends Omit<ProgressStep, 'state'> {
	progressLabel?: string;
	state: ProgressStepState | 'skipped';
}
