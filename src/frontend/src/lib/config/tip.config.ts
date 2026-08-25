import { WizardStepsTip } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const tipWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps<WizardStepsTip> => [
	{
		name: WizardStepsTip.INTRO,
		title: i18n.tip.text.intro_title
	},
	{
		name: WizardStepsTip.TOKENS_LIST,
		title: i18n.tip.text.select_token
	},
	{
		name: WizardStepsTip.CREATE,
		title: i18n.tip.text.create_title
	},
	{
		name: WizardStepsTip.SHARE,
		title: i18n.tip.text.share_title
	},
	{
		name: WizardStepsTip.HISTORY,
		title: i18n.tip.text.history_title
	}
];
