import { ckEthMinterCanister } from '$icp-eth/api/cketh-minter.api';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Eip1559TransactionPrice, MinterInfo, RetrieveEthRequest } from '@dfinity/cketh';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { get } from 'svelte/store';

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
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

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
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { eip1559TransactionPrice } = await ckEthMinterCanister({ identity, minterCanisterId });

	return eip1559TransactionPrice(rest);
};

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<MinterInfo> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getMinterInfo } = await ckEthMinterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};
