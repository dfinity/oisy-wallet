import { ckEthMinterCanister } from '$icp-eth/api/cketh-minter.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	Eip1559TransactionPrice,
	RetrieveEthRequest
} from '@dfinity/cketh/dist/candid/minter';
import { assertNonNullish } from '@dfinity/utils';

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
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<Eip1559TransactionPrice> => {
	assertNonNullish(identity, 'No internet identity.');

	const { eip1559TransactionPrice } = await ckEthMinterCanister({ identity, minterCanisterId });

	return eip1559TransactionPrice();
};
