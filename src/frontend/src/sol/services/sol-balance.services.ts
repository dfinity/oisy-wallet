import type { SolAddress } from '$lib/types/address';
import { LAMPORTS_PER_SOL } from '$sol/constants/sol.constants';
import type { SolNetwork } from '$sol/types/network';
import { createSolanaRpc, address as solAddress, type Lamports } from '@solana/web3.js';

export const loadLamportsBalance = async ({
	address,
	network: { rpcUrl }
}: {
	address: SolAddress;
	network: SolNetwork;
}): Promise<Lamports> => {
	const rpc = createSolanaRpc(rpcUrl);

	const wallet = solAddress(address);
	const { value: balance } = await rpc.getBalance(wallet).send();

	return balance;
};

export const loadSolBalance = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolNetwork;
}): Promise<number> => {
	const balance = await loadLamportsBalance({ address, network });

	return Number(balance) / LAMPORTS_PER_SOL;
};
