import { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardSteps } from '@dfinity/gix-components';

// TODO: Merge with the sendWizardSteps used for IC and ETH
export const sendWizardSteps = (i18n: I18n): WizardSteps => [
	{
		name: WizardStepsSend.TOKENS_LIST,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.SEND,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.REVIEW,
		title: i18n.send.text.review
	},
	{
		name: WizardStepsSend.SENDING,
		title: i18n.send.text.sending
	}
];
