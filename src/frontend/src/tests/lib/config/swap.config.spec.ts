import { swapWizardSteps } from '$lib/config/swap.config';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('swap.config', () => {
	describe('swapWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = swapWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsSwap.SWAP,
					title: en.swap.text.swap
				},
				{
					name: WizardStepsSwap.REVIEW,
					title: en.swap.text.review
				},
				{
					name: WizardStepsSwap.SWAPPING,
					title: en.swap.text.executing_transaction
				}
			]);
		});
	});
});
