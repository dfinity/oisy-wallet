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
 * How an OISY Trade swap ended before it could hand settlement to its Active User
 * Transaction row. Everything after that hand-off — a fill, a kill, a stalled
 * withdrawal — is reported by the row, not by an exception.
 *
 * `not_trackable` is the row itself failing to open. Unlike every other provider,
 * whose tracking is best-effort, that aborts the swap before anything moves: the
 * row is the recovery record, and a swap without one is precisely the
 * stranded-funds case it exists to prevent. `not_placed` is an order the canister
 * refused to accept, thrown only once the deposit has been recovered to the wallet.
 * `recovery_failed` is the one kind raised while funds are still in DEX custody:
 * the order was refused and withdrawing the deposit back failed, so the message
 * points the user at the Trading tab, where the balance is visible — and the row is
 * deliberately left non-terminal so the poller keeps trying.
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
		public readonly kind: 'not_trackable' | 'not_placed' | 'recovery_failed'
	) {
		super(message);
		this.name = 'OisyTradeSwapError';
	}
}
