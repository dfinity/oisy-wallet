import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const walletConnectSignSteps = ({
	i18n,
	signWithSending
}: {
	i18n: I18n;
	signWithSending: boolean;
}): ProgressSteps => [
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
	...(signWithSending
		? ([
				{
					step: ProgressStepsSendSol.SEND,
					text: i18n.send.text.sending,
					state: 'next'
				}
			] as ProgressSteps)
		: []),
	{
		step: ProgressStepsSign.APPROVE_WALLET_CONNECT,
		text: i18n.send.text.approving,
		state: 'next'
	}
];
