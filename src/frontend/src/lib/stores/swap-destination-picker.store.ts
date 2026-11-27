// Opens the step that picks the address a swap pays out to, set by `SwapModalWizardSteps`, which owns
// the swap's steps. A form without it (rendered on its own) shows no destination row.
export interface SwapDestinationPickerContext {
	showDestinationPicker: () => void;
}

export const SWAP_DESTINATION_PICKER_CONTEXT_KEY = Symbol('swap-destination-picker');
