import { ckEthMinterCanister } from '$icp-eth/api/cketh-minter.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Eip1559TransactionPrice, RetrieveEthRequest } from '@dfinity/cketh';
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
	assertNonNullish(identity);

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
	assertNonNullish(identity);

	const { eip1559TransactionPrice } = await ckEthMinterCanister({ identity, minterCanisterId });

	return eip1559TransactionPrice(rest);
};
