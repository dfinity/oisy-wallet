import { ICPSwapPoolCanister } from '$lib/canisters/icp-swap-pool.canister';
import type {
	ICPSwapAmountReply,
	ICPSwapDepositWithdrawParams,
	ICPSwapGetUserUnusedBalanceParams,
	ICPSwapQuoteParams,
	ICPSwapQuoteSwapParams
} from '$lib/types/api';
import type {
	CanisterApiFunctionParams,
	CanisterApiFunctionParamsWithCanisterId,
	CanisterIdText
} from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { getPool } from './icp-swap-factory.api';

const getPoolCanister = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: Omit<CanisterApiFunctionParams, 'canisterId'> & {
	canisterId: CanisterIdText;
}): Promise<ICPSwapPoolCanister> => {
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

	if (isNullish(pool)) {
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
