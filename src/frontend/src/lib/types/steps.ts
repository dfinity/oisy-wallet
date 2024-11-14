import type { ProgressStep, ProgressStepState } from '@dfinity/gix-components';

export interface StaticStep extends Omit<ProgressStep, 'state'> {
	progressLabel?: string;
	state: ProgressStepState | 'skipped';
}

export interface WizardStepsParams {
	i18n: I18n;
}
