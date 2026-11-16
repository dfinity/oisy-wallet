import type { Network } from '$lib/types/network';

// Where the shortcuts for what to receive on the swap form lead, set by `SwapModalWizardSteps`, which
// owns the swap's steps. A form without it (rendered on its own) shows the receive field as before.
export interface SwapReceiveShortcutsContext {
	// The receive list on a network, or on all networks for `undefined`, and on all asset types, for
	// this one opening: it does not count as the person changing the receive side's filters.
	showReceiveList: (network: Network | undefined) => void;
	// "Move <symbol> to": the pay token's group on the other networks it reaches.
	showMoveStep: () => void;
}

export const SWAP_RECEIVE_SHORTCUTS_CONTEXT_KEY = Symbol('swap-receive-shortcuts');
