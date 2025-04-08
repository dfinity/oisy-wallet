import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const authHelpWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps => [
	{
		name: WizardStepsAuthHelp.OVERVIEW,
		title: 'Have issues with authentication?'
	},
	{
		name: WizardStepsAuthHelp.HELP_IDENTITY,
		title: 'Have issues with authentication?'
	},
	{
		name: WizardStepsAuthHelp.HELP_OTHERS,
		title: 'Have issues with authentication?'
	}
];
