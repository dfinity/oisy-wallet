import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { CanisterApi } from '$lib/api/canister.api';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { ICP_SWAP_FACTORY_CANISTER_ID } from '$lib/constants/app.constants';
import type { ICPSwapGetPoolParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

const icpSwapApi = new CanisterApi<ICPSwapFactoryCanister>();

export const getPoolCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId,
	...restParams
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>): Promise<PoolData> => {
	const { getPool } = await icpSwapFactoryCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getPool(restParams);
};

const icpSwapFactoryCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = ICP_SWAP_FACTORY_CANISTER_ID
}: CanisterApiFunctionParams): Promise<ICPSwapFactoryCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await icpSwapApi.getCanister({
		identity,
		create: () =>
			ICPSwapFactoryCanister.create({
				identity,
				canisterId: Principal.fromText(canisterId)
			})
	});
};
