import { ICPSwapFactoryCanister } from '$lib/canisters/icp_swap.canister'; // ваш canister
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

const SWAP_FACTORY_CANISTER_ID = '4mmnk-kiaaa-aaaag-qbllq-cai';

export const getPool = async ({
	identity,
	token0,
	token1,
	fee,
	canisterId = SWAP_FACTORY_CANISTER_ID
}: {
	identity: any;
	token0: { address: string; standard: string };
	token1: { address: string; standard: string };
	fee: bigint;
	canisterId?: string;
}) => {
	const swapFactoryCanister = await icpSwapFactoryCanister({ identity, canisterId });

	const result = await swapFactoryCanister.getPool({
		token0: { address: token0.address, standard: token0.standard },
		token1: { address: token1.address, standard: token1.standard },
		fee
	});

	return result;
};

const icpSwapFactoryCanister = async ({
	identity,
	canisterId = SWAP_FACTORY_CANISTER_ID
}: {
	identity: any;
	canisterId: string;
}) => {
	assertNonNullish(identity, 'Identity is required');

	const canister = await ICPSwapFactoryCanister.create({
		identity,
		canisterId: Principal.fromText(canisterId)
	});

	return canister;
};

export const getQuote = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum = '0'
}: {
	identity: any;
	canisterId: string;
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum?: string;
}) => {
	assertNonNullish(identity, 'Identity required');

	const swapPoolCanister = await icpSwapFactoryCanister({ identity, canisterId });

	return swapPoolCanister.quote({
		amountIn,
		zeroForOne,
		amountOutMinimum
	});
};

export const swapTokens = async ({
	identity,
	canisterId,
	amountIn,
	zeroForOne,
	amountOutMinimum
}: {
	identity: any;
	canisterId: string;
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
}) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.swap({ amountIn, zeroForOne, amountOutMinimum });
};

export const deposit = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: {
	identity: any;
	canisterId: string;
	token: string;
	amount: bigint;
	fee: bigint;
}) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.deposit({ token, amount, fee });
};

export const depositFrom = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: {
	identity: any;
	canisterId: string;
	token: string;
	amount: bigint;
	fee: bigint;
}) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.depositFrom({ token, amount, fee });
};

export const withdraw = async ({
	identity,
	canisterId,
	token,
	amount,
	fee
}: {
	identity: any;
	canisterId: string;
	token: string;
	amount: bigint;
	fee: bigint;
}) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.withdraw({ token, amount, fee });
};

export const getUserUnusedBalance = async ({
	identity,
	canisterId,
	principal
}: {
	identity: any;
	canisterId: string;
	principal: Principal;
}) => {
	const swapPool = await icpSwapFactoryCanister({ identity, canisterId });
	return swapPool.getUserUnusedBalance(principal);
};
