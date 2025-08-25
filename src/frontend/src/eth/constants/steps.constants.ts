import { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const sendSteps = ({
	i18n,
	sendWithApproval
}: {
	i18n: I18n;
	sendWithApproval: boolean;
}): [ProgressStep, ...ProgressStep[]] => [
	{
		step: ProgressStepsSend.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	} as ProgressStep,
	...(sendWithApproval
		? [
				{
					step: ProgressStepsSend.SIGN_APPROVE,
					text: i18n.send.text.signing_approval,
					state: 'next'
				} as ProgressStep,
				{
					step: ProgressStepsSend.APPROVE,
					text: i18n.send.text.approving,
					state: 'next'
				} as ProgressStep
			]
		: []),
	{
		step: ProgressStepsSend.SIGN_TRANSFER,
		text: i18n.send.text.signing_transaction,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsSend.TRANSFER,
		text: i18n.send.text.sending,
		state: 'next'
	} as ProgressStep
];

export const walletConnectSendSteps = ({
	i18n,
	...rest
}: {
	i18n: I18n;
	sendWithApproval: boolean;
}): [ProgressStep, ...ProgressStep[]] => [
	...sendSteps({
		i18n,
		...rest
	}),
	{
		step: ProgressStepsSend.APPROVE_WALLET_CONNECT,
		text: i18n.send.text.approving_wallet_connect,
		state: 'next'
	}
];

export const walletConnectSignSteps = (i18n: I18n): [ProgressStep, ...ProgressStep[]] => [
	{
		step: ProgressStepsSend.INITIALIZATION,
		text: i18n.send.text.initializing,
		state: 'in_progress'
	} as ProgressStep,
	{
		step: ProgressStepsSend.SIGN_TRANSFER,
		text: i18n.send.text.signing_message,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsSend.TRANSFER,
		text: i18n.send.text.approving,
		state: 'next'
	} as ProgressStep
];
