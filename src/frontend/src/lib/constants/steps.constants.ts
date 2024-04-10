import { AddTokenStep } from '$lib/enums/steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const addTokenSteps = (i18n: I18n): [ProgressStep, ...ProgressStep[]] => [
	{
		step: AddTokenStep.INITIALIZATION,
		text: i18n.tokens.text.initializing,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: AddTokenStep.SAVE,
		text: i18n.tokens.import.saving,
		state: 'next'
	} as ProgressStep,
	{
		step: AddTokenStep.UPDATE_UI,
		text: i18n.tokens.text.updating_ui,
		state: 'next'
	} as ProgressStep
];
