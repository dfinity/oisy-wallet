import type { TokenId } from '$lib/types/token';

export class UserProfileNotFoundError extends Error {}

export class LoadIdbAddressError extends Error {
	constructor(private readonly _tokenId: TokenId) {
		super();
	}

	get tokenId(): TokenId {
		return this._tokenId;
	}
}
