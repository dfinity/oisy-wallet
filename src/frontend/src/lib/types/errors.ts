import type { SwapAmountMinimum } from '$lib/types/swap';

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
 * `minimum` is the provider's minimum, when the provider names one. See
 * `SwapAmountMinimum` for why it carries its own denomination.
 */
export class SwapAmountTooLowError extends Error {
	constructor(
		message: string,
		readonly minimum?: SwapAmountMinimum
	) {
		super(message);
	}
}
