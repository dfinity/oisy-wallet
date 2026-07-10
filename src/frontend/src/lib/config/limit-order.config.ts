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
		// The base is what you sell on a Sell but what you buy on a Buy, so the
		// picker title tracks the side rather than being fixed to "sell".
		name: WizardStepsLimitOrder.BASE_TOKEN,
		title:
			side === 'buy'
				? i18n.trading.limit_order.select_base_token_buy
				: i18n.trading.limit_order.select_base_token_sell
	},
	{
		name: WizardStepsLimitOrder.QUOTE_TOKEN,
		title: i18n.trading.limit_order.select_quote_token
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
