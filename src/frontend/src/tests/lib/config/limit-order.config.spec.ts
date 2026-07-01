import { limitOrderWizardSteps } from '$lib/config/limit-order.config';
import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('limit-order.config', () => {
	describe('limitOrderWizardSteps', () => {
		const mockParams = {
			i18n: en
		};

		it('should return the correct steps with expected names and titles', () => {
			const steps = limitOrderWizardSteps(mockParams);

			expect(steps).toStrictEqual([
				{
					name: WizardStepsLimitOrder.FORM,
					title: en.trading.limit_order.title
				},
				{
					name: WizardStepsLimitOrder.BASE_TOKEN,
					title: en.trading.limit_order.select_base_token
				},
				{
					name: WizardStepsLimitOrder.QUOTE_TOKEN,
					title: en.trading.limit_order.select_quote_token
				},
				{
					name: WizardStepsLimitOrder.REVIEW,
					title: en.trading.limit_order.review_title
				},
				{
					name: WizardStepsLimitOrder.PLACING,
					title: en.trading.limit_order.placing_title
				}
			]);
		});
	});
});
