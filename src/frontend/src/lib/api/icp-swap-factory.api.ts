import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { ICP_SWAP_CANISTER_ID } from '$lib/constants/app.constants';
import type { ICPSwapGetPoolParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

// let canister: ICPSwapFactoryCanister | undefined = undefined;

const icpSwapFactoryCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = ICP_SWAP_CANISTER_ID
}: CanisterApiFunctionParams): Promise<ICPSwapFactoryCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	console.log('icpSwapFactoryCanister', canisterId);

	const canister = await ICPSwapFactoryCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});

	console.log('icpSwapFactoryCanister canister', canister);

	return canister;
};

export const getPool = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId,
	...restParams
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>): Promise<PoolData> => {
	console.log(`before getPool: ${canisterId}`);

	const { getPool } = await icpSwapFactoryCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getPool(restParams);
};
