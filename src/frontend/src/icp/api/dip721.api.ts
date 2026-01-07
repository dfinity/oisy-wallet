import { Dip721Canister } from '$icp/canisters/dip721.canister';
import { ZERO } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Returns the count of NFTs owned by the principal.
 *
 * @link https://github.com/Psychedelic/DIP721/blob/develop/spec.md#balanceof
 */
export const balance = async ({
	certified,
	identity,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<QueryParams>): Promise<bigint> => {
	if (isNullish(identity)) {
		return ZERO;
	}

	const { balance } = await dip721Canister({
		identity,
		canisterId,
		...rest
	});

	return await balance({ principal: identity.getPrincipal(), certified });
};

/**
 * Returns the list of the token_identifier of the NFT associated with the principal.
 *
 * @link https://github.com/Psychedelic/DIP721/blob/develop/spec.md#ownertokenidentifiers
 */
export const getTokensByOwner = async ({
	certified,
	identity,
	owner: principal,
	canisterId,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<{ owner: Principal } & QueryParams>): Promise<
	bigint[]
> => {
	if (isNullish(identity)) {
		return [];
	}

	const { getTokensByOwner } = await dip721Canister({
		identity,
		canisterId,
		...rest
	});

	return await getTokensByOwner({ certified, principal });
};

/**
 * Sends the caller's NFT token_identifier.
 *
 * @link https://github.com/Psychedelic/DIP721/blob/develop/spec.md#transfer
 */
export const transfer = async ({
	certified,
	identity,
	canisterId,
	to,
	tokenIdentifier,
	...rest
}: CanisterApiFunctionParamsWithCanisterId<
	{ to: Principal; tokenIdentifier: bigint } & QueryParams
>) => {
	const { transfer } = await dip721Canister({
		identity,
		canisterId,
		...rest
	});

	await transfer({ certified, to, tokenIdentifier });
};

const dip721Canister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<Dip721Canister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await Dip721Canister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
