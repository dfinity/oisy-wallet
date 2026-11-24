import { cyclesTopUpWizardSteps } from '$lib/config/cycles-top-up.config';
import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('cycles-top-up.config', () => {
	describe('cyclesTopUpWizardSteps', () => {
		it('should return the canister, amount, review and topping-up steps in order', () => {
			expect(cyclesTopUpWizardSteps({ i18n: en })).toStrictEqual([
				{
					name: WizardStepsCyclesTopUp.CANISTER,
					title: en.cycles_top_up.text.title
				},
				{
					name: WizardStepsCyclesTopUp.AMOUNT,
					title: en.cycles_top_up.text.title
				},
				{
					name: WizardStepsCyclesTopUp.REVIEW,
					title: en.convert.text.review
				},
				{
					name: WizardStepsCyclesTopUp.TOPPING_UP,
					title: en.cycles_top_up.text.title
				}
			]);
		});
	});
});
