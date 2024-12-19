import type { NetworkId } from '$lib/types/network';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { address as solAddress } from '@solana/addresses';
import { BigNumber } from '@ethersproject/bignumber';
import { assertNonNullish } from '@dfinity/utils';
import type { SolAddress } from '$lib/types/address';

export const loadSolBalance = async ({
	address,
	networkId
}: {
	address: SolAddress;
	networkId: NetworkId;
}): Promise<BigNumber> => {
	assertNonNullish(address);
	assertNonNullish(networkId);

	const { getBalance } = solanaHttpRpc(networkId);
	const wallet = solAddress(address);

	const { value: balance } = await getBalance(wallet).send();

	return BigNumber.from(balance);
};
