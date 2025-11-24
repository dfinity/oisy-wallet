import type { WizardStepsGetToken } from '$lib/enums/wizard-steps';

export type WizardStepsGetTokenType =
	(typeof WizardStepsGetToken)[keyof typeof WizardStepsGetToken];
