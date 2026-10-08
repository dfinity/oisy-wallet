import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const authHelpWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsAuthHelp> => [
	{
		name: WizardStepsAuthHelp.OVERVIEW,
		title: i18n.auth.help.text.title
	},
	{
		name: WizardStepsAuthHelp.HELP_NEW_IDENTITY,
		title: i18n.auth.help.text.title
	}
];
