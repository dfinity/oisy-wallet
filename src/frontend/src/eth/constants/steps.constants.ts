import { ProgressStepsSend, ProgressStepsSign } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const sendSteps = ({
	i18n,
	sendWithApproval
}: {
	i18n: I18n;
	sendWithApproval: boolean;
}): ProgressSteps => [
	{
		step: ProgressStepsSend.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	},
	...(sendWithApproval
		? ([
				{
					step: ProgressStepsSend.SIGN_APPROVE,
					text: i18n.send.text.signing_approval,
					state: 'next'
				},
				{
					step: ProgressStepsSend.APPROVE,
					text: i18n.send.text.approving,
					state: 'next'
				}
			] as ProgressSteps)
		: []),
	{
		step: ProgressStepsSend.SIGN_TRANSFER,
		text: i18n.send.text.signing_transaction,
		state: 'next'
	},
	{
		step: ProgressStepsSend.TRANSFER,
		text: i18n.send.text.sending,
		state: 'next'
	}
];

export const walletConnectSendSteps = ({
	i18n,
	...rest
}: {
	i18n: I18n;
	sendWithApproval: boolean;
}): ProgressSteps => [
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

export const walletConnectSignSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsSign.INITIALIZATION,
		text: i18n.send.text.initializing,
		state: 'in_progress'
	},
	{
		step: ProgressStepsSign.SIGN,
		text: i18n.send.text.signing_message,
		state: 'next'
	},
	{
		step: ProgressStepsSign.APPROVE_WALLET_CONNECT,
		text: i18n.send.text.approving_wallet_connect,
		state: 'next'
	}
];
