import { browser } from '$app/environment';
import type { OptionAmount } from '$lib/types/send';
import { isNullish } from '@dfinity/utils';

/**
 * The max slippage the user last chose, kept in `sessionStorage` for the tab.
 *
 * Kept apart from `swap.utils` so the auth service can drop it without loading the swap code.
 */
const SWAP_SLIPPAGE_STORAGE_KEY = 'oisy_swap_max_slippage';

export const loadSwapSlippage = (): number | undefined => {
	try {
		if (!browser) {
			return;
		}

		const stored = sessionStorage.getItem(SWAP_SLIPPAGE_STORAGE_KEY);

		if (isNullish(stored)) {
			return;
		}

		const value = Number(stored);

		return Number.isFinite(value) && value > 0 ? value : undefined;
	} catch (_: unknown) {
		return undefined;
	}
};

export const saveSwapSlippage = (slippageValue: OptionAmount) => {
	try {
		if (!browser || isNullish(slippageValue)) {
			return;
		}

		sessionStorage.setItem(SWAP_SLIPPAGE_STORAGE_KEY, `${Number(slippageValue)}`);
	} catch (_: unknown) {
		// Not saving only means the next swap opens at the default.
	}
};

export const forgetSwapSlippage = () => {
	try {
		if (!browser) {
			return;
		}

		sessionStorage.removeItem(SWAP_SLIPPAGE_STORAGE_KEY);
	} catch (_: unknown) {
		// Nothing to do: sign-out clears the session storage anyway.
	}
};
