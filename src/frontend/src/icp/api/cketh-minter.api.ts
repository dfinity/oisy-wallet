import { ckEthMinterCanister } from '$icp-eth/api/cketh-minter.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { MinterInfo } from '@dfinity/cketh';
import type {
	Eip1559TransactionPrice,
	RetrieveEthRequest
} from '@dfinity/cketh/dist/candid/minter';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

export const withdrawEth = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<RetrieveEthRequest> => {
	assertNonNullish(identity, 'No internet identity.');

	const { withdrawEth } = await ckEthMinterCanister({ identity, minterCanisterId });

	return withdrawEth(params);
};

export const eip1559TransactionPrice = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<Eip1559TransactionPrice> => {
	assertNonNullish(identity, 'No internet identity.');

	const { eip1559TransactionPrice } = await ckEthMinterCanister({ identity, minterCanisterId });

	// TODO: does not work locally
	// return eip1559TransactionPrice(rest);

	return {
		max_priority_fee_per_gas: 1_500_000_000n,
		max_fee_per_gas: 11_332_030_494n,
		max_transaction_fee: 237_972_640_374_000n,
		timestamp: [1_708_535_922_705_724_331n],
		gas_limit: 21_000n
	};
};

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<MinterInfo> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getMinterInfo } = await ckEthMinterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};
