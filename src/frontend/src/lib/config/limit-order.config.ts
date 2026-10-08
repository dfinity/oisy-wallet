import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

export interface LimitOrderWizardStepsParams extends WizardStepsParams {
	side: LimitOrderSide;
}

export const limitOrderWizardSteps = ({
	i18n,
	side
}: LimitOrderWizardStepsParams): WizardSteps<WizardStepsLimitOrder> => [
	{
		name: WizardStepsLimitOrder.FORM,
		title: i18n.trading.limit_order.title
	},
	{
		// Both pickers title by whether their leg is the one being sold or bought,
		// which flips with the side: on a Sell the base is sold and the quote is
		// bought; on a Buy the base is bought and the quote is sold.
		name: WizardStepsLimitOrder.BASE_TOKEN,
		title:
			side === 'buy'
				? i18n.trading.limit_order.select_buy_token
				: i18n.trading.limit_order.select_sell_token
	},
	{
		name: WizardStepsLimitOrder.QUOTE_TOKEN,
		title:
			side === 'buy'
				? i18n.trading.limit_order.select_sell_token
				: i18n.trading.limit_order.select_buy_token
	},
	{
		name: WizardStepsLimitOrder.REVIEW,
		title: i18n.trading.limit_order.review_title
	},
	{
		name: WizardStepsLimitOrder.PLACING,
		title: i18n.trading.limit_order.placing_title
	}
];
