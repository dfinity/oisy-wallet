import type { TokenId } from '$lib/types/token';

export class UserProfileNotFoundError extends Error {}

export class UserNotVipError extends Error {}
export class InvalidCodeError extends Error {}
export class AlreadyClaimedError extends Error {}

export class LoadIdbAddressError extends Error {
	constructor(private readonly _tokenId: TokenId) {
		super();
	}

	get tokenId(): TokenId {
		return this._tokenId;
	}
}
