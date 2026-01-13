import { IcPunksCanister } from '$icp/canisters/icpunks.canister';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

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

	const { getTokensByOwner } = await icPunksCanister({
		identity,
		canisterId,
		...rest
	});

	return await getTokensByOwner({ certified, principal });
};

const icPunksCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId): Promise<IcPunksCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await IcPunksCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};
