import { ProgressStepsAddToken, ProgressStepsSendXrp } from '$lib/enums/progress-steps';
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

// Adding a trust-line token, on the add-token modal's own step scale: its `SAVE` is the signing and
// its `UPDATE_UI` the submit, as `addXrpTrustLineToken` maps them. No step waits for the ledger, for
// the reason the send has none.
export const addXrpTrustLineTokenSteps = (i18n: I18n): ProgressSteps => [
	{
		step: ProgressStepsAddToken.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	},
	{
		step: ProgressStepsAddToken.SAVE,
		text: i18n.send.text.signing_message,
		state: 'next'
	},
	{
		step: ProgressStepsAddToken.UPDATE_UI,
		text: i18n.send.text.sending,
		state: 'next'
	}
];
