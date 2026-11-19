import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const cyclesTopUpWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsCyclesTopUp> => [
	{
		name: WizardStepsCyclesTopUp.CANISTER,
		title: i18n.cycles_top_up.text.title
	},
	{
		name: WizardStepsCyclesTopUp.AMOUNT,
		title: i18n.cycles_top_up.text.title
	},
	{
		name: WizardStepsCyclesTopUp.REVIEW,
		title: i18n.convert.text.review
	},
	{
		name: WizardStepsCyclesTopUp.TOPPING_UP,
		title: i18n.cycles_top_up.text.title
	}
];
