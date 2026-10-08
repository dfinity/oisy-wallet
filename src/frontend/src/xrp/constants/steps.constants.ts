import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';

// No `CONFIRM` step: the send stops at the submit and the Active User Transaction record carries
// the outcome from there, so the wizard has nothing left to wait for. A step that sat on
// "Confirming" for the whole validity window would be claiming the modal knows something it does
// not — and the one place the outcome IS reported is the record's terminal side effects.

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
		step: ProgressStepsSendXrp.RELOAD,
		text: i18n.send.text.refreshing_ui,
		state: 'next'
	}
];
