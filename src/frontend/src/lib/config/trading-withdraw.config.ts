import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const tradingWithdrawWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsTradingWithdraw> => [
	{
		name: WizardStepsTradingWithdraw.WITHDRAW,
		title: i18n.trading.withdraw.title
	},
	{
		name: WizardStepsTradingWithdraw.REVIEW,
		title: i18n.trading.withdraw.review_title
	},
	{
		name: WizardStepsTradingWithdraw.WITHDRAWING,
		title: i18n.trading.withdraw.progress_title
	}
];
