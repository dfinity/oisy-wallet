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
