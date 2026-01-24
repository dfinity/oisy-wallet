import { ProgressStepsSendKaspa } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const sendSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsSendKaspa.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	},
	{
		step: ProgressStepsSendKaspa.SIGN,
		text: i18n.send.text.signing_message,
		state: 'next'
	},
	{
		step: ProgressStepsSendKaspa.SEND,
		text: i18n.send.text.sending,
		state: 'next'
	},
	{
		step: ProgressStepsSendKaspa.RELOAD,
		text: i18n.send.text.refreshing_ui,
		state: 'next'
	}
];
