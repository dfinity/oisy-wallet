import { mapEthereumErrorMsg } from '$eth/utils/eth-error.utils';
import {
	LifiFeeChangedError,
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError
} from '$lib/types/errors';
import { errorDetailToString } from '$lib/utils/error.utils';
import { nonNullish } from '@dfinity/utils';

export type LifiSwapErrorType =
	'fee_changed' | 'slippage_exceeded' | 'quote_rejected' | 'insufficient_funds' | 'unknown';

/**
 * The allow-listed category of a failed LI.FI swap, for analytics. Its error text comes from LI.FI's
 * SDK, whose messages carry the request URL and with it the user's addresses, or from the EVM node
 * and ethers, which embed the signed transaction: none of it may reach analytics (invariant 4 in
 * `docs/ai/frontend/analytics.md`). The message itself stays for the toast and the console.
 */
export const toLifiSwapErrorType = (err: unknown): LifiSwapErrorType => {
	if (err instanceof LifiFeeChangedError) {
		return 'fee_changed';
	}

	// `fetchLifiEvmSwap`'s own wording, which the wizard recognises by the same prefix.
	if (errorDetailToString(err)?.startsWith('Slippage exceeded.') === true) {
		return 'slippage_exceeded';
	}

	// A re-quote OISY refuses, by its trust checks or by its route.
	if (err instanceof LifiQuoteRejectedError || err instanceof LifiRouteUnsupportedError) {
		return 'quote_rejected';
	}

	if (nonNullish(mapEthereumErrorMsg(err))) {
		return 'insufficient_funds';
	}

	return 'unknown';
};
