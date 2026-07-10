import { limitOrderWizardSteps } from '$lib/config/limit-order.config';
import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
import en from '$tests/mocks/i18n.mock';

describe('limit-order.config', () => {
	describe('limitOrderWizardSteps', () => {
		it('should title the base leg "sell" and the quote leg "buy" for a sell', () => {
			const steps = limitOrderWizardSteps({ i18n: en, side: 'sell' });

			expect(steps).toStrictEqual([
				{
					name: WizardStepsLimitOrder.FORM,
					title: en.trading.limit_order.title
				},
				{
					name: WizardStepsLimitOrder.BASE_TOKEN,
					title: en.trading.limit_order.select_sell_token
				},
				{
					name: WizardStepsLimitOrder.QUOTE_TOKEN,
					title: en.trading.limit_order.select_buy_token
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

		it('should flip the leg titles for a buy (base "buy", quote "sell")', () => {
			const steps = limitOrderWizardSteps({ i18n: en, side: 'buy' });

			expect(steps).toContainEqual({
				name: WizardStepsLimitOrder.BASE_TOKEN,
				title: en.trading.limit_order.select_buy_token
			});
			expect(steps).toContainEqual({
				name: WizardStepsLimitOrder.QUOTE_TOKEN,
				title: en.trading.limit_order.select_sell_token
			});
		});
	});
});
