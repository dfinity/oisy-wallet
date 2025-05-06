import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { ICPSwapPoolCanister } from '$lib/canisters/icp-swap-pool.canister';
import { ICP_SWAP_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	ICPSwapAmountReply,
	ICPSwapDepositWithdrawParams,
	ICPSwapGetPoolParams,
	ICPSwapGetUserUnusedBalanceParams,
	ICPSwapQuoteParams,
	ICPSwapQuoteSwapParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const getPool = async ({
	identity,
	token0,
	token1,
	fee,
	canisterId = ICP_SWAP_CANISTER_ID
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>): Promise<PoolData> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const factory = await ICPSwapFactoryCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
	return factory.getPool({ token0, token1, fee });
};

const getPoolCanister = async ({
	identity,
	canisterId
}: CanisterApiFunctionParams<{
	canisterId: string;
}>): Promise<ICPSwapPoolCanister> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	return await ICPSwapPoolCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});
};

export const getQuote = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum
}: CanisterApiFunctionParams<ICPSwapQuoteSwapParams>): Promise<bigint> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const { quote } = await getPoolCanister({ identity, canisterId });
	return quote({ amountIn, zeroForOne, amountOutMinimum });
};

export const swap = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum
}: CanisterApiFunctionParams<ICPSwapQuoteSwapParams>): Promise<bigint> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const pool = await getPoolCanister({ identity, canisterId });
	return pool.swap({ amountIn, zeroForOne, amountOutMinimum });
};

export const deposit = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const { deposit } = await getPoolCanister({ identity, canisterId });
	return deposit({ token, amount, fee });
};

export const depositFrom = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const { depositFrom } = await getPoolCanister({ identity, canisterId });
	return depositFrom({ token, amount, fee });
};

export const withdraw = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapDepositWithdrawParams>): Promise<bigint> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const { withdraw } = await getPoolCanister({ identity, canisterId });
	return withdraw({ token, amount, fee });
};

export const getUserUnusedBalance = async ({
	identity,
	canisterId,
	principal
}: CanisterApiFunctionParams<ICPSwapGetUserUnusedBalanceParams>): Promise<{
	balance0: bigint;
	balance1: bigint;
}> => {
	assertNonNullish(canisterId, 'Missing pool canister ID');
	assertNonNullish(identity, 'Identity is required');

	const { getUserUnusedBalance } = await getPoolCanister({ identity, canisterId });
	return getUserUnusedBalance(principal);
};

export const getIcpSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	sourceAmount,
	fee = 3000n // The only supported pool fee on ICPSwap at the moment (0.3%)
}: ICPSwapQuoteParams): Promise<ICPSwapAmountReply> => {
	const pool = await getPool({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard },
		fee
	});

	if (!pool) {
		throw new Error('Pool not found');
	}

	const quote = await getQuote({
		identity,
		canisterId: pool.canisterId.toString(),
		amountIn: sourceAmount.toString(),
		zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId,
		amountOutMinimum: '0' // No minimum here as this is just a quote; slippage protection applies only during actual swap
	});

	return { receiveAmount: quote };
};
