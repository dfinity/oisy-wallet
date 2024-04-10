import { SendStep } from '$lib/enums/steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const sendSteps = (i18n: I18n): [ProgressStep, ...ProgressStep[]] => [
	{
		step: SendStep.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: SendStep.SIGN,
		text: i18n.send.text.signing_transaction,
		state: 'next'
	} as ProgressStep,
	{
		step: SendStep.SEND,
		text: i18n.send.text.sending,
		state: 'next'
	} as ProgressStep
];

export const walletConnectSendSteps = (i18n: I18n): [ProgressStep, ...ProgressStep[]] => [
	...sendSteps(i18n),
	{
		step: SendStep.APPROVE,
		text: i18n.send.text.approving,
		state: 'next'
	}
];

export const walletConnectSignSteps = (i18n: I18n): [ProgressStep, ...ProgressStep[]] => [
	{
		step: SendStep.INITIALIZATION,
		text: i18n.send.text.initializing,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: SendStep.SIGN,
		text: i18n.send.text.signing_message,
		state: 'next'
	} as ProgressStep,
	{
		step: SendStep.SEND,
		text: i18n.send.text.approving,
		state: 'next'
	} as ProgressStep
];
