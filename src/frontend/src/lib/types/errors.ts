import type { TokenId } from '$lib/types/token';

export class UserProfileNotFoundError extends Error {}

export class AddressError extends Error {
	tokenId: TokenId;

	constructor(tokenId: TokenId) {
		super();
		Object.setPrototypeOf(this, AddressError.prototype);
		this.tokenId = tokenId;
	}
}
