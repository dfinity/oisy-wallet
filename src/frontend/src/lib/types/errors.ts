import type { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { LiFiStep } from '@lifi/sdk';

export class UserProfileNotFoundError extends Error {}

export class SignupsClosedError extends Error {}

export class UserNotVipError extends Error {}

export class EligibilityError extends Error {}

export class InvalidCodeError extends Error {}

export class AlreadyClaimedError extends Error {}

export class InvalidCampaignError extends Error {}

export class NftError extends Error {
	constructor(
		private readonly _tokenUri: string,
		private readonly _contractAddress: string
	) {
		super();
	}

	get tokenUri(): string {
		return this._tokenUri;
	}

	get contractAddress(): string {
		return this._contractAddress;
	}
}

export class InvalidTokenUri extends NftError {}

export class InvalidMetadataImageUrl extends NftError {}

export class AuthClientNotInitializedError extends Error {}

// A call that did not settle within the time it was given. It says nothing about the outcome: the
// call itself carries on, and may still succeed or fail after this was raised.
export class TimeoutError extends Error {}

/**
 * A swap quote provider refused the requested amount as below its minimum.
 *
 * `minAmount` is the provider's minimum, in the source token's smallest unit,
 * when the provider names one.
 */
export class SwapAmountTooLowError extends Error {
	constructor(
		message: string,
		readonly minAmount?: bigint
	) {
		super(message);
	}
}

/**
 * A swap quote provider has no offer for the pair, but routes it through one token OISY lists in a
 * shape OISY cannot verify, so the user can make it as two separate swaps through that token.
 */
export class SwapViaIntermediateTokenError extends Error {
	readonly intermediateToken: Token;
	readonly provider: SwapProvider;

	constructor({
		intermediateToken,
		provider
	}: {
		intermediateToken: Token;
		provider: SwapProvider;
	}) {
		super('The swap can be made as two separate swaps');

		this.intermediateToken = intermediateToken;
		this.provider = provider;
	}
}

/**
 * A LI.FI quote failed OISY's own checks: it names a target or spender other than the pinned
 * Diamond, or echoes a request other than the one sent. LI.FI quotes are unsigned, so such a quote
 * is never shown nor acted on.
 */
export class LifiQuoteRejectedError extends Error {}

/**
 * A LI.FI quote passed the trust checks, but its route is one the calldata binding would refuse
 * (see `isLifiRouteExecutable`), even after re-quoting without the bridge it took. There is no route
 * OISY can execute.
 *
 * `route` is the refused route, which the two-swap hint reads its in-between token from; `cause`, the
 * failure of the re-quote without its bridge.
 */
export class LifiRouteUnsupportedError extends Error {
	readonly route?: LiFiStep;

	constructor(message: string, { route, cause }: { route?: LiFiStep; cause?: unknown } = {}) {
		super(message, { cause });

		this.route = route;
	}
}

/**
 * A swap transaction's broadcast ended without showing whether it was sent. An earlier attempt failed
 * in a way that may have relayed the signed bytes, so a refusal of a later one answers only that
 * attempt, against a state the first may already have changed (a balance it spent). The swap counts
 * as sent and its tracking row stays, as for any other unknown outcome. `cause` is the last attempt's
 * error.
 */
export class SwapBroadcastOutcomeUnknownError extends Error {
	constructor({ cause }: { cause: unknown }) {
		super('The swap transaction may have been sent: its broadcast outcome is unknown.', { cause });
	}
}

/**
 * The LI.FI swap's network fee ceiling, from OISY's own gas estimate at execution, exceeds the one
 * the user reviewed, so it was not signed. It carries what that ceiling was made of — the gas and
 * the L1 data fee of that very transaction — back to the review, which prices them at its own fee
 * per gas and shows the result for the user to confirm.
 */
export class LifiFeeChangedError extends Error {
	readonly gas: bigint;
	readonly l1Fee: bigint;

	constructor({ gas, l1Fee }: { gas: bigint; l1Fee: bigint }) {
		super('The network fee of the LI.FI swap rose above the one reviewed.');

		this.gas = gas;
		this.l1Fee = l1Fee;
	}
}

/**
 * The LI.FI Solana swap's ceiling — its network fee plus the rent of the accounts it creates, read
 * from the transaction about to be signed — exceeds the one the user reviewed, so it was not signed.
 * It carries that ceiling, in lamports, with the headroom on its network fee a displayed quote's
 * has, back to the review for the user to confirm.
 */
export class LifiSolFeeChangedError extends Error {
	readonly ceiling: bigint;

	constructor({ ceiling }: { ceiling: bigint }) {
		super('The network fee of the LI.FI swap rose above the one reviewed.');

		this.ceiling = ceiling;
	}
}

/**
 * A Velora swap failed OISY's own checks before signing: its order or transaction is not the swap
 * the user reviewed, or it names a contract other than the one pinned for the network. Velora's
 * answers are unsigned, so such a swap is never signed.
 */
export class VeloraSwapRejectedError extends Error {}

/**
 * Rift answered a request with an error status. `status` lets callers tell a missing route (422) or
 * an expired quote (410) apart from a failure; the message is Rift's own text, which is never shown or
 * reported as is.
 */
export class RiftApiError extends Error {
	readonly status: number;

	constructor({ status, message }: { status: number; message: string }) {
		super(`Rift request failed (${status}): ${message}`);

		this.status = status;
	}
}

/**
 * Rift answered with a body that is not the one its API describes, or not in the `raw` format OISY
 * asked for. Rift's answers are unsigned, so such an answer is never acted on.
 */
export class RiftInvalidResponseError extends Error {}

/**
 * A quote request was still waiting for its turn under Rift's rate limit when a newer one replaced it:
 * only the latest inputs are worth quoting. Nothing was sent to Rift.
 */
export class RiftRequestSupersededError extends Error {}

/**
 * Why a Rift swap stopped before its deposit was broadcast: `quoteExpired` when the reviewed quote
 * expired, `orderRefused` when Rift refused the order or it could not be read again right before the
 * broadcast, `orderUnverified` when the order does not match the review, and `orderInFlight` when the
 * order already has a row or a deposit.
 */
export type RiftSwapRefusal = 'quoteExpired' | 'orderRefused' | 'orderUnverified' | 'orderInFlight';

export class RiftSwapRefusedError extends Error {
	readonly reason: RiftSwapRefusal;

	constructor(reason: RiftSwapRefusal, options?: ErrorOptions) {
		super(`Rift swap refused before its deposit: ${reason}`, options);

		this.reason = reason;
	}
}

/**
 * Why a SOL → ckSOL conversion stopped at the minter's `watch_deposit_address`, before any SOL was
 * sent: `inFlight` when a deposit of the account is already in flight, `changed` when the deposit
 * address, the minimum or the fee is not the one the offer was priced with, `quarantined` when an
 * earlier deposit of the account is quarantined, and `unavailable` when the minter could not
 * register the address.
 */
export type ChainFusionSolDepositRefusal = 'inFlight' | 'changed' | 'quarantined' | 'unavailable';

export class ChainFusionSolDepositRefusedError extends Error {
	readonly reason: ChainFusionSolDepositRefusal;

	constructor(reason: ChainFusionSolDepositRefusal, options?: ErrorOptions) {
		super(`The ckSOL minter does not take this deposit: ${reason}`, options);

		this.reason = reason;
	}
}

/**
 * A native SOL transfer to Liquidium that was never sent: it failed before its broadcast, or the node
 * refused the broadcast. Its `cause` is the original failure. Any other failure of such a transfer
 * may come after the SOL left.
 */
export class LiquidiumSolTransferRefusedError extends Error {
	constructor(options?: ErrorOptions) {
		super('The SOL transfer to Liquidium was not sent', options);
	}
}

/**
 * The blockhash of a native SOL transfer to Liquidium was no longer valid just before its broadcast,
 * so nothing was sent. The blockhash is in the message for the logs only.
 */
export class LiquidiumSolBlockhashExpiredError extends Error {
	constructor(blockhash: string) {
		super(`The blockhash ${blockhash} of the SOL transfer is no longer valid`);
	}
}
