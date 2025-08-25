import { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardSteps } from '@dfinity/gix-components';

interface SendWizardStepsParams {
	i18n: I18n;
	converting?: boolean;
}

export const sendWizardSteps = ({ i18n, converting }: SendWizardStepsParams): WizardSteps => [
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
		title: converting ? i18n.convert.text.converting : i18n.send.text.sending
	}
];

export const sendWizardStepsWithQrCodeScan = (params: SendWizardStepsParams): WizardSteps => [
	...sendWizardSteps(params),
	{
		name: WizardStepsSend.QR_CODE_SCAN,
		title: params.i18n.send.text.scan_qr
	}
];

export const allSendWizardSteps = (params: SendWizardStepsParams): WizardSteps => [
	{
		name: WizardStepsSend.TOKENS_LIST,
		title: params.i18n.send.text.send
	},
	...sendWizardStepsWithQrCodeScan(params)
];
