import { WizardStepsConvert, WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

export interface ConvertWizardStepsParams extends WizardStepsParams {
	sourceToken: string;
	destinationToken: string;
}

export type WizardStepsConvertComplete = WizardStepsConvert | WizardStepsSend;

export const convertWizardSteps = ({
	i18n,
	sourceToken,
	destinationToken
}: ConvertWizardStepsParams): WizardSteps<WizardStepsConvertComplete> => [
	{
		name: WizardStepsConvert.CONVERT,
		title: replacePlaceholders(i18n.convert.text.swap_to_token, {
			$sourceToken: sourceToken,
			$destinationToken: destinationToken
		})
	},
	{
		name: WizardStepsConvert.REVIEW,
		title: i18n.convert.text.review
	},
	{
		name: WizardStepsConvert.CONVERTING,
		title: i18n.convert.text.executing_transaction
	},
	{
		name: WizardStepsConvert.DESTINATION,
		title: i18n.convert.text.conversion_destination
	},
	{
		name: WizardStepsSend.QR_CODE_SCAN,
		title: i18n.send.text.scan_qr
	}
];
