import type { SwapErrorCodes } from '$lib/types/swap';

//TODO: revisit throwSwapError
export const throwSwapError = ({
	code,
	message,
	variant,
	swapSucceded
}: {
	code: SwapErrorCodes;
	message?: string;
	variant?: 'error' | 'warning' | 'info';
	swapSucceded?: boolean;
}): never => {
	throw new SwapError(code, message, variant, swapSucceded);
};

export class SwapError extends Error {
	public readonly variant?: 'error' | 'warning' | 'info';
	public readonly swapSucceded?: boolean;

	constructor(
		public readonly code: SwapErrorCodes,
		message?: string,
		variant?: 'error' | 'warning' | 'info',
		swapSucceded?: boolean
	) {
		super(message);
		this.name = 'SwapError';
		this.variant = variant;
		this.swapSucceded = swapSucceded;
	}
}

/**
 * How an OISY Trade swap ended when the destination token did not arrive.
 *
 * `killed` is a fill-or-kill order the book could not fill — an expected market
 * outcome, and the source funds have already been withdrawn back to the wallet
 * when this is thrown. `unresolved` means the settlement found neither the order
 * nor any balance in DEX custody, so there is nothing left to recover and nothing
 * that says how the order ended.
 *
 * A dedicated class, and defined here rather than next to its thrower, so
 * `SwapIcpWizard` can recognize both by `instanceof` and present them in Review
 * (like slippage-exceeded) instead of as an unexpected-error toast — even when a
 * test mocks the OISY Trade services module away. `kind` also rides into the
 * failure analytics as the error key.
 */
export class OisyTradeSwapError extends Error {
	constructor(
		message: string,
		public readonly kind: 'killed' | 'unresolved'
	) {
		super(message);
		this.name = 'OisyTradeSwapError';
	}
}
