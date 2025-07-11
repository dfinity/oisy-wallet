import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const swapWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps => [
	{
		name: WizardStepsSwap.SWAP,
		title: i18n.swap.text.swap
	},
	{
		name: WizardStepsSwap.REVIEW,
		title: i18n.swap.text.review
	},
	{
		name: WizardStepsSwap.SWAPPING,
		title: i18n.swap.text.executing_transaction
	}
];

export const allSwapWizardSteps = (params: WizardStepsParams): WizardSteps => [
	...swapWizardSteps(params),
	{
		name: WizardStepsSwap.TOKENS_LIST,
		title: params.i18n.send.text.select_token
	},
	{
		name: WizardStepsSwap.FILTER_NETWORKS,
		title: params.i18n.send.text.select_network_filter
	}
];
