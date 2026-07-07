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
	},
	// Last so it stays off the linear next/back path; reached only via an explicit jump.
	{
		name: WizardStepsTradingWithdraw.TOKENS_LIST,
		title: i18n.send.text.select_token
	}
];
