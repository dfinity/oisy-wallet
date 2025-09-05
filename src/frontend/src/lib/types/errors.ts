import type { NetworkId } from '$lib/types/network';

export class UserProfileNotFoundError extends Error {}

export class UserNotVipError extends Error {}

export class EligibilityError extends Error {}

export class InvalidCodeError extends Error {}

export class AlreadyClaimedError extends Error {}

export class InvalidCampaignError extends Error {}

export class LoadIdbAddressError extends Error {
	constructor(private readonly _networkId: NetworkId) {
		super();
	}

	get networkId(): NetworkId {
		return this._networkId;
	}
}

export class NftError extends Error {
	constructor(
		private readonly _tokenUri: number,
		private readonly _contractAddress: string
	) {
		super();
	}

	get tokenUri(): number {
		return this._tokenUri;
	}

	get contractAddress(): string {
		return this._contractAddress;
	}
}

export class InvalidTokenUri extends NftError {}

export class InvalidMetadataImageUrl extends NftError {}

export class AuthClientNotInitializedError extends Error {}
