import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const swapWizardSteps = ({ i18n }: WizardStepsParams): WizardSteps<WizardStepsSwap> => [
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
	},
	{
		name: WizardStepsSwap.TOKENS_LIST,
		title: i18n.send.text.select_token
	},
	{
		name: WizardStepsSwap.FILTER_NETWORKS,
		title: i18n.send.text.select_network_filter
	},
	{
		name: WizardStepsSwap.SELECT_PROVIDER,
		title: i18n.swap.text.select_swap_provider
	}
];
