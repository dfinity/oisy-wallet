import type { SolAddress } from '$lib/types/address';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import { assertNonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';

//lamports are like satoshis: https://solana.com/docs/terminology#lamport
export const loadSolLamportsBalance = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<bigint> => {
	assertNonNullish(address);
	assertNonNullish(network);

	const { getBalance } = solanaHttpRpc(network);
	const wallet = solAddress(address);

	const { value: balance } = await getBalance(wallet).send();

	return balance;
};
