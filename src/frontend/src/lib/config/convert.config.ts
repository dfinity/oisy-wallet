import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

interface ConvertWizardStepsParams extends WizardStepsParams {
	sourceToken: string;
	destinationToken: string;
}

export const convertWizardSteps = ({
	i18n,
	sourceToken,
	destinationToken
}: ConvertWizardStepsParams): WizardSteps => [
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
	}
];
