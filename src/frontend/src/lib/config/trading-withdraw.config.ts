import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

const withdrawFlowSteps = ({
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

const tokensListStep = ({ i18n }: WizardStepsParams): WizardSteps<WizardStepsTradingWithdraw> => [
	{
		name: WizardStepsTradingWithdraw.TOKENS_LIST,
		title: i18n.trading.withdraw.title
	}
];

// Seeded entry (a token is preselected, e.g. the Assets tab): the wizard opens on the
// withdraw form and the picker is only a jump target, so it stays last — off the linear
// next/back path.
export const tradingWithdrawWizardSteps = (
	params: WizardStepsParams
): WizardSteps<WizardStepsTradingWithdraw> => [
	...withdrawFlowSteps(params),
	...tokensListStep(params)
];

// Hero entry (no preselected token): the picker is the first step so the user chooses what
// to withdraw before the form, mirroring the Send modal.
export const allTradingWithdrawWizardSteps = (
	params: WizardStepsParams
): WizardSteps<WizardStepsTradingWithdraw> => [
	...tokensListStep(params),
	...withdrawFlowSteps(params)
];
