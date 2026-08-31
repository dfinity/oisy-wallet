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
 * when this is thrown. `not_placed` is an order the canister refused to accept —
 * likewise thrown only once the deposit has been recovered to the wallet.
 * `unresolved` means the settlement found neither the order nor any balance in
 * DEX custody, so there is nothing left to recover and nothing that says how the
 * order ended. `recovery_failed` is the one kind raised while funds are still in
 * DEX custody: the order was refused and withdrawing the deposit back failed, so
 * the message points the user at the Trading tab, where the balance is visible.
 *
 * A dedicated class, and defined here rather than next to its thrower, so
 * `SwapIcpWizard` can recognize all of them by `instanceof` and present them in
 * Review (like slippage-exceeded) instead of as an unexpected-error toast — even
 * when a test mocks the OISY Trade services module away. `kind` also rides into
 * the failure analytics as the error key.
 */
export class OisyTradeSwapError extends Error {
	constructor(
		message: string,
		public readonly kind: 'killed' | 'not_placed' | 'unresolved' | 'recovery_failed'
	) {
		super(message);
		this.name = 'OisyTradeSwapError';
	}
}
