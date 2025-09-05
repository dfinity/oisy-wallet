import { authHelpWizardSteps } from '$lib/config/auth-help.config';
import { WizardStepsAuthHelp } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('auth-help.config', () => {
	describe('authHelpWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = authHelpWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsAuthHelp.OVERVIEW,
					title: en.auth.help.text.title
				},
				{
					name: WizardStepsAuthHelp.HELP_IDENTITY,
					title: en.auth.help.text.title
				},
				{
					name: WizardStepsAuthHelp.HELP_OTHER,
					title: en.auth.help.text.title
				}
			]);
		});
	});
});
