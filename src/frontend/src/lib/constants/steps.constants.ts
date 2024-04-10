import { AddTokenStep, HideTokenStep } from '$lib/enums/steps';
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

export const HIDE_TOKEN_STEPS: [ProgressStep, ...ProgressStep[]] = [
	{
		step: HideTokenStep.INITIALIZATION,
		text: 'Initializing...',
		state: 'in_progress'
	} as ProgressStep,
	{
		step: HideTokenStep.HIDE,
		text: 'Hiding...',
		state: 'next'
	} as ProgressStep,
	{
		step: HideTokenStep.UPDATE_UI,
		text: 'Updating the UI...',
		state: 'next'
	} as ProgressStep
];
