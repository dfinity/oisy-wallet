import { ProgressStepsSendStepName } from '$lib/enums/progress-steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const sendWizardSteps = (i18n: I18n): WizardSteps => [
	{
		name: ProgressStepsSendStepName.SEND,
		title: i18n.send.text.send
	},
	{
		name: ProgressStepsSendStepName.REVIEW,
		title: i18n.send.text.review
	},
	{
		name: ProgressStepsSendStepName.SENDING,
		title: i18n.send.text.sending
	}
];
