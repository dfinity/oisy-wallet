import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';
import type { ProgressStep } from '@dfinity/gix-components';

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
