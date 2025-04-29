import { ICPSwapFactoryCanister } from '$lib/canisters/icp_swap.canister';
import type {
	ICPSwapDepositParams,
	ICPSwapGetPoolParams,
	ICPSwapGetUserUnusedBalanceParams,
	ICPSwapQuoteParams,
	ICPSwapSwapParams,
	ICPSwapWithdrawParams
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { ICPSwapRawResult, SwapQuoteParams } from '$lib/types/swap';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

const SWAP_FACTORY_CANISTER_ID = '4mmnk-kiaaa-aaaag-qbllq-cai';

let icpSwapInstance: ICPSwapFactoryCanister | undefined;

export const icpSwapFactoryCanister = async ({
	identity,
	canisterId = SWAP_FACTORY_CANISTER_ID,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): Promise<ICPSwapFactoryCanister> => {
	assertNonNullish(identity, 'Identity is required');
	const canister = await ICPSwapFactoryCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});

	return canister;
};

export const getPool = async ({
	identity,
	token0,
	token1,
	fee = 3000n,
	canisterId
}: CanisterApiFunctionParams<ICPSwapGetPoolParams>) => {
	const swapFactory = await icpSwapFactoryCanister({ identity, canisterId });
	return swapFactory.getPool({ token0, token1, fee });
};

export const getQuote = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum = '0'
}: CanisterApiFunctionParams<ICPSwapQuoteParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.quote({ amountIn, zeroForOne, amountOutMinimum });
};

export const swapTokens = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum
}: CanisterApiFunctionParams<ICPSwapSwapParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.swap({ amountIn, zeroForOne, amountOutMinimum });
};

export const deposit = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapDepositParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.deposit({
		token,
		amount,
		fee
	});
};

export const depositFrom = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapDepositParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.depositFrom({
		token,
		amount,
		fee
	});
};

export const withdraw = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: CanisterApiFunctionParams<ICPSwapWithdrawParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.withdraw({
		token,
		amount,
		fee
	});
};

export const getUserUnusedBalance = async ({
	identity,
	canisterId,
	principal
}: CanisterApiFunctionParams<ICPSwapGetUserUnusedBalanceParams>) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.getUserUnusedBalance(principal);
};


export const getIcpSwapAmounts = async ({
	identity,
	sourceToken,
	destinationToken,
	sourceAmount
}: SwapQuoteParams): Promise<ICPSwapRawResult> => {

	console.log('in Pool');
	
	const pool = await getPool({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard }
	});

	console.log(Object.keys(pool))

	if (!pool) {
		throw new Error('Pool not found');
	}

	const quote = await getQuote({
		identity,
		canisterId: pool.canisterId.toString(),
		amountIn: sourceAmount.toString(),
		zeroForOne: pool.token0.address === sourceToken.ledgerCanisterId
	});

	return {
		receiveAmount: quote
	};
};