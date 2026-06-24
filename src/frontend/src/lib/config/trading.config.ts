import { WizardStepsTradingDeposit } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const tradingDepositWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsTradingDeposit> => [
	{
		name: WizardStepsTradingDeposit.DEPOSIT,
		title: i18n.trading.deposit.title
	},
	{
		name: WizardStepsTradingDeposit.REVIEW,
		title: i18n.trading.deposit.review_title
	},
	{
		name: WizardStepsTradingDeposit.DEPOSITING,
		title: i18n.trading.deposit.progress_title
	}
];
