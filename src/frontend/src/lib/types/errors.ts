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
 * A LI.FI quote failed OISY's own checks: it names a target or spender other than the pinned
 * Diamond, or echoes a request other than the one sent. LI.FI quotes are unsigned, so such a quote
 * is never shown nor acted on.
 */
export class LifiQuoteRejectedError extends Error {}

/**
 * A LI.FI quote passed the trust checks, but its route is one the calldata binding would refuse
 * (see `isLifiRouteExecutable`), even after re-quoting without the bridge it took. There is no route
 * OISY can execute.
 */
export class LifiRouteUnsupportedError extends Error {}

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
