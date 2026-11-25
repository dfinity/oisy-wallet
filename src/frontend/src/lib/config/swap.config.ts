import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

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
		name: WizardStepsSwap.SELECT_PROVIDER,
		title: i18n.swap.text.smart_swap
	},
	// Titled by the modal, which knows the symbol: "Move <symbol> to".
	{
		name: WizardStepsSwap.MOVE_TOKEN,
		title: i18n.swap.text.move_token_to
	},
	{
		name: WizardStepsSwap.DESTINATION,
		title: i18n.core.text.destination
	},
	{
		name: WizardStepsSwap.QR_CODE_SCAN,
		title: i18n.send.text.scan_qr
	}
];
