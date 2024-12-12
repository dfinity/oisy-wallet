import { balancesStore } from '$lib/stores/balances.store';
import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { SolNetwork } from '$sol/types/network';
import { BigNumber } from '@ethersproject/bignumber';
import { createSolanaRpc, address as solAddress, type Lamports } from '@solana/web3.js';

export const loadLamportsBalance = async ({
	address,
	network: { rpcUrl }
}: {
	address: SolAddress;
	network: SolNetwork;
}): Promise<Lamports> => {
	const { getBalance } = createSolanaRpc(rpcUrl);

	const wallet = solAddress(address);
	const { value: balance } = await getBalance(wallet).send();

	return balance;
};

export const loadSolBalance = async ({
	address,
	token: { network, id: tokenId }
}: {
	address: SolAddress;
	token: Token;
}): Promise<ResultSuccess> => {
	const balance = await loadLamportsBalance({ address, network: network as SolNetwork });

	balancesStore.set({ tokenId, data: { data: BigNumber.from(balance), certified: true } });

	return { success: true };
};
