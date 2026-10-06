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
 * A fill-or-kill order is decided in the matching round after it is accepted, so the
 * whole flow resolves in seconds and settles with the modal open — which is why
 * these are exceptions the wizard presents rather than statuses a background poller
 * reports. The Active User Transaction row is there for the session that dies
 * mid-flow; a session that lives sees one of these instead.
 *
 * `not_trackable` is the row itself failing to open. Unlike every other provider,
 * whose tracking is best-effort, that aborts the swap before anything moves: the
 * row is the recovery record, and a swap without one is precisely the
 * stranded-funds case it exists to prevent. `killed` is a fill-or-kill order the
 * book could not fill — an expected market outcome, whose source funds are back in
 * the wallet by the time it is thrown. `not_placed` is an order the canister refused
 * to accept, likewise thrown only once the deposit has been recovered.
 * `unresolved` means settlement found neither the order nor any attributable
 * balance, so there is nothing left to recover and nothing that says how it ended.
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
		public readonly kind:
			'not_trackable' | 'killed' | 'not_placed' | 'unresolved' | 'recovery_failed'
	) {
		super(message);
		this.name = 'OisyTradeSwapError';
	}
}
