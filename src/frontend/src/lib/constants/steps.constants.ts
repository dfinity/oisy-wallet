import { AddTokenStep, SendStep } from '$lib/enums/steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const SEND_STEPS: [ProgressStep, ...ProgressStep[]] = [
	{
		step: SendStep.INITIALIZATION,
		text: 'Initializing transaction...',
		state: 'in_progress'
	} as ProgressStep,
	{
		step: SendStep.SIGN,
		text: 'Signing transaction...',
		state: 'next'
	} as ProgressStep,
	{
		step: SendStep.SEND,
		text: 'Sending...',
		state: 'next'
	} as ProgressStep
];

export const WALLET_CONNECT_SEND_STEPS: [ProgressStep, ...ProgressStep[]] = [
	...SEND_STEPS,
	{
		step: SendStep.APPROVE,
		text: 'Approving...',
		state: 'next'
	}
];

export const WALLET_CONNECT_SIGN_STEPS: [ProgressStep, ...ProgressStep[]] = [
	{
		step: SendStep.INITIALIZATION,
		text: 'Initializing...',
		state: 'in_progress'
	} as ProgressStep,
	{
		step: SendStep.SIGN,
		text: 'Signing message...',
		state: 'next'
	} as ProgressStep,
	{
		step: SendStep.SEND,
		text: 'Approving...',
		state: 'next'
	} as ProgressStep
];

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

export const SEND_ICP_STEPS: [ProgressStep, ...ProgressStep[]] = [
	{
		step: SendStep.INITIALIZATION,
		text: 'Initializing transaction...',
		state: 'in_progress'
	} as ProgressStep,
	{
		step: SendStep.SEND,
		text: 'Sending...',
		state: 'next'
	} as ProgressStep
];
