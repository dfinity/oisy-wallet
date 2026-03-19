import { WizardStepsTip } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const tipWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps<WizardStepsTip> => [
	{
		name: WizardStepsTip.TOKENS_LIST,
		title: i18n.tip.text.select_token
	},
	{
		name: WizardStepsTip.AMOUNT,
		title: i18n.tip.text.amount
	},
	{
		name: WizardStepsTip.REVIEW,
		title: i18n.tip.text.review
	},
	{
		name: WizardStepsTip.CREATING,
		title: i18n.tip.text.creating
	},
	{
		name: WizardStepsTip.SHARE,
		title: i18n.tip.text.share
	}
];
