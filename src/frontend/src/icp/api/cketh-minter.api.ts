import { ckEthMinterCanister } from '$icp-eth/api/cketh-minter.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish } from '@dfinity/utils';
import type { CkEthMinterDid, Eip1559TransactionPriceParams } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';

export const withdrawEth = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<CkEthMinterDid.RetrieveEthRequest> => {
	assertNonNullish(identity);

	const { withdrawEth } = await ckEthMinterCanister({ identity, minterCanisterId });

	return withdrawEth(params);
};

export const withdrawErc20 = async ({
	identity,
	minterCanisterId,
	ledgerCanisterId,
	...params
}: {
	identity: NullishIdentity;
	ledgerCanisterId: CanisterIdText;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<CkEthMinterDid.RetrieveErc20Request> => {
	assertNonNullish(identity);

	const { withdrawErc20 } = await ckEthMinterCanister({ identity, minterCanisterId });

	return withdrawErc20({
		...params,
		ledgerCanisterId: Principal.fromText(ledgerCanisterId)
	});
};

export const eip1559TransactionPrice = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: NullishIdentity;
	minterCanisterId: CanisterIdText;
} & Eip1559TransactionPriceParams): Promise<CkEthMinterDid.Eip1559TransactionPrice> => {
	assertNonNullish(identity);

	const { eip1559TransactionPrice } = await ckEthMinterCanister({ identity, minterCanisterId });

	return eip1559TransactionPrice(rest);
};
