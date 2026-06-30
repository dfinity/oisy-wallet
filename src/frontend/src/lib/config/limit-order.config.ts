import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

export const limitOrderWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<WizardStepsLimitOrder> => [
	{
		name: WizardStepsLimitOrder.FORM,
		title: i18n.trading.limit_order.title
	},
	{
		name: WizardStepsLimitOrder.BASE_TOKEN,
		title: i18n.trading.limit_order.select_base_token
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
