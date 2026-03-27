import {
	convertWizardSteps,
	type ConvertWizardStepsParams,
	type WizardStepsConvertComplete
} from '$lib/config/convert.config';
import { WizardStepsHowToConvert } from '$lib/enums/wizard-steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

export type WizardStepsHowToConvertComplete = WizardStepsHowToConvert | WizardStepsConvertComplete;

export const howToConvertWizardSteps = ({
	i18n,
	sourceToken,
	destinationToken
}: ConvertWizardStepsParams): WizardSteps<WizardStepsHowToConvertComplete> => [
	{
		name: WizardStepsHowToConvert.INFO,
		title: replacePlaceholders(i18n.info.ethereum.how_to_short, {
			$token: destinationToken
		})
	},
	{
		name: WizardStepsHowToConvert.ETH_QR_CODE,
		title: i18n.receive.text.address
	},
	...convertWizardSteps({ i18n, sourceToken, destinationToken })
];
