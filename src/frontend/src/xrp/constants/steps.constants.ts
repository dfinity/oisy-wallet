import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const sendSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsSendXrp.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	},
	{
		step: ProgressStepsSendXrp.SIGN,
		text: i18n.send.text.signing_message,
		state: 'next'
	},
	{
		step: ProgressStepsSendXrp.SEND,
		text: i18n.send.text.sending,
		state: 'next'
	},
	{
		step: ProgressStepsSendXrp.CONFIRM,
		text: i18n.send.text.confirming,
		state: 'next'
	},
	{
		step: ProgressStepsSendXrp.RELOAD,
		text: i18n.send.text.refreshing_ui,
		state: 'next'
	}
];
