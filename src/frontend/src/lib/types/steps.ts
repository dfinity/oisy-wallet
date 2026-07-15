import type { ProgressStep, ProgressStepState } from '$lib/types/progress-step';

export interface StaticStep extends Omit<ProgressStep, 'state'> {
	progressLabel?: string;
	state: ProgressStepState | 'skipped';
}

export interface WizardStepsParams {
	i18n: I18n;
}
