import { AddTokenStep } from '$lib/enums/steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const ADD_TOKEN_STEPS: [ProgressStep, ...ProgressStep[]] = [
	{
		step: AddTokenStep.INITIALIZATION,
		text: 'Initializing...',
		state: 'in_progress'
	} as ProgressStep,
	{
		step: AddTokenStep.SAVE,
		text: 'Saving...',
		state: 'next'
	} as ProgressStep,
	{
		step: AddTokenStep.UPDATE_UI,
		text: 'Updating the UI...',
		state: 'next'
	} as ProgressStep
];
