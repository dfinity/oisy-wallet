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
