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

    console.log('getPool result:', result);
    

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
