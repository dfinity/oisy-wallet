import { ProgressStepsAddToken, ProgressStepsTip } from '$lib/enums/progress-steps';
import type { ProgressStep } from '$lib/types/progress-step';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const addTokenSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsAddToken.INITIALIZATION,
		text: i18n.tokens.text.initializing,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: ProgressStepsAddToken.SAVE,
		text: i18n.tokens.import.text.saving,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsAddToken.UPDATE_UI,
		text: i18n.tokens.text.updating_ui,
		state: 'next'
	} as ProgressStep
];

/**
 * Named for what the sender gets, not for the call that runs. A sender does not
 * know what an allowance or a claim-code hash is, and the three stages are only
 * worth showing at all because each one is something they would recognise as
 * part of making a tip.
 */
export const tipSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsTip.RESERVE,
		text: i18n.tip.text.step_reserving,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: ProgressStepsTip.CREATE,
		text: i18n.tip.text.step_creating,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsTip.SAVE,
		text: i18n.tip.text.step_saving,
		state: 'next'
	} as ProgressStep
];
