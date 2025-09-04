import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import { ICPSwapPoolCanister } from '$lib/canisters/icp-swap-pool.canister';
import type {
	ICPSwapDepositWithdrawParams,
	ICPSwapGetUserUnusedBalanceParams,
	ICPSwapQuoteSwapParams
} from '$lib/types/api';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

const getPoolCanister = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParamsWithCanisterId): Promise<ICPSwapPoolCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await ICPSwapPoolCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};

export const getQuote = async ({
	identity,
	canisterId,
	...restParams
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapQuoteSwapParams>): Promise<bigint> => {
	const { quote } = await getPoolCanister({ identity, canisterId });
	return quote(restParams);
};

export const swap = async ({
	identity,
	canisterId,
	...restParams
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapQuoteSwapParams>): Promise<bigint> => {
	const pool = await getPoolCanister({ identity, canisterId });
	return pool.swap(restParams);
};

export const deposit = async ({
	identity,
	canisterId,
	...restParams
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	const { deposit } = await getPoolCanister({ identity, canisterId });
	return deposit(restParams);
};

export const depositFrom = async ({
	identity,
	canisterId,
	...restParams
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	const { depositFrom } = await getPoolCanister({ identity, canisterId });
	return depositFrom(restParams);
};

export const withdraw = async ({
	identity,
	canisterId,
	...restParams
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	const { withdraw } = await getPoolCanister({ identity, canisterId });
	return withdraw(restParams);
};

export const getUserUnusedBalance = async ({
	identity,
	canisterId,
	principal
}: CanisterApiFunctionParamsWithCanisterId<ICPSwapGetUserUnusedBalanceParams>): Promise<{
	balance0: bigint;
	balance1: bigint;
}> => {
	const { getUserUnusedBalance } = await getPoolCanister({ identity, canisterId });
	return getUserUnusedBalance(principal);
};

export const getPoolMetadata = async ({
	identity,
	canisterId
}: CanisterApiFunctionParamsWithCanisterId<{ identity: Identity }>): Promise<PoolMetadata> => {
	const { getPoolMetadata } = await getPoolCanister({ identity, canisterId });
	return getPoolMetadata();
};
