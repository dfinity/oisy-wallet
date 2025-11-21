import { swapWizardSteps } from '$lib/config/swap.config';
import { WizardStepsGetToken } from '$lib/enums/wizard-steps';
import type { WizardStepsGetTokenType } from '$lib/types/get-token';
import type { WizardStepsParams } from '$lib/types/steps';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { WizardSteps } from '@dfinity/gix-components';

export interface GetTokenWizardStepsParams extends WizardStepsParams {
	tokenSymbol: string;
}

export const getTokenWizardSteps = ({
	i18n,
	tokenSymbol
}: GetTokenWizardStepsParams): WizardSteps<WizardStepsGetTokenType> => [
	{
		name: WizardStepsGetToken.GET_TOKEN,
		title: replacePlaceholders(i18n.get_token.text.title, {
			$token: tokenSymbol
		})
	},
	...swapWizardSteps({ i18n })
];
