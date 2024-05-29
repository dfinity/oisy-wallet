import { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const sendWizardSteps = (i18n: I18n): WizardSteps => [
	{
		name: WizardStepsSend.SEND,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.QR_CODE_SCAN,
		title: i18n.send.text.scan_qr
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
