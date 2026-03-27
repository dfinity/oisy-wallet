import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const walletConnectReviewWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsWalletConnect> => [
	{
		name: WizardStepsWalletConnect.REVIEW,
		title: i18n.wallet_connect.text.session_proposal
	}
];

export const walletConnectWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsWalletConnect> => [
	{
		name: WizardStepsWalletConnect.CONNECT,
		title: i18n.wallet_connect.text.name
	},
	...walletConnectReviewWizardSteps({ i18n })
];
