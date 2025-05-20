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
