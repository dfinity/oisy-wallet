import { isInsufficientBalanceError } from '$eth/utils/eth-error.utils';
import { PLAUSIBLE_EVENT_SWAP_ERROR_TYPES } from '$lib/enums/plausible';
import {
	LifiFeeChangedError,
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError
} from '$lib/types/errors';
import { errorDetailToString } from '$lib/utils/error.utils';

/**
 * The allow-listed category of a failed LI.FI swap, for analytics. Its error text comes from LI.FI's
 * SDK, whose messages carry the request URL and with it the user's addresses, or from the EVM node
 * and ethers, which embed the signed transaction: none of it may reach analytics (invariant 4 in
 * `docs/ai/frontend/analytics.md`). The message itself stays for the toast and the console.
 */
export const toLifiSwapErrorType = (err: unknown): PLAUSIBLE_EVENT_SWAP_ERROR_TYPES => {
	if (err instanceof LifiFeeChangedError) {
		return PLAUSIBLE_EVENT_SWAP_ERROR_TYPES.FEE_CHANGED;
	}

	// `fetchLifiEvmSwap`'s own wording, which the wizard recognises by the same prefix.
	if (errorDetailToString(err)?.startsWith('Slippage exceeded.') === true) {
		return PLAUSIBLE_EVENT_SWAP_ERROR_TYPES.SLIPPAGE_EXCEEDED;
	}

	// A re-quote OISY refuses, by its trust checks or by its route.
	if (err instanceof LifiQuoteRejectedError || err instanceof LifiRouteUnsupportedError) {
		return PLAUSIBLE_EVENT_SWAP_ERROR_TYPES.QUOTE_REJECTED;
	}

	// Asked directly: the EVM send's messages also explain failures that are not about the balance,
	// such as a nonce that could not be read.
	if (isInsufficientBalanceError(err)) {
		return PLAUSIBLE_EVENT_SWAP_ERROR_TYPES.INSUFFICIENT_FUNDS;
	}

	return PLAUSIBLE_EVENT_SWAP_ERROR_TYPES.UNKNOWN;
};
