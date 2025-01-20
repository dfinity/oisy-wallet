import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

export const sendSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsSendSol.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	},
	{
		step: ProgressStepsSendSol.SEND,
		text: i18n.send.text.sending,
		state: 'next'
	},
	{
		step: ProgressStepsSendSol.RELOAD,
		text: i18n.send.text.refreshing_ui,
		state: 'next'
	}
];
