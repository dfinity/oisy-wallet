import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import type { ICPSwapGetPoolParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: ICPSwapFactoryCanister | undefined = undefined;

export const getPool = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId,
	...restParams
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>): Promise<PoolData> => {
	const factory = await icpSwapFactoryCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	console.log(`getPool: ${JSON.stringify(getPool)}`);

	return factory.getPool(restParams);
};

const icpSwapFactoryCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = '4mmnk-kiaaa-aaaag-qbllq-cai'
}: CanisterApiFunctionParams): Promise<ICPSwapFactoryCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	console.log(`ICPSwapFactoryCanister: ${canisterId}`);

	if (isNullish(canister)) {
		canister = await ICPSwapFactoryCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	console.log(`ICPSwapFactoryCanister: ${canister}`);

	return canister;
};
