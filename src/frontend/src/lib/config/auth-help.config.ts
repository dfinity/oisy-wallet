import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const authHelpWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsAuthHelp> => [
	{
		name: WizardStepsAuthHelp.OVERVIEW,
		title: i18n.auth.help.text.title
	},
	{
		name: WizardStepsAuthHelp.HELP_IDENTITY,
		title: i18n.auth.help.text.title
	},
	{
		name: WizardStepsAuthHelp.HELP_OTHER,
		title: i18n.auth.help.text.title
	}
];
