import { balancesStore } from '$lib/stores/balances.store';
import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { isSolNetwork } from '$sol/validation/sol-network.validation';
import { BigNumber } from '@ethersproject/bignumber';
import { createSolanaRpc, lamports, address as solAddress, type Lamports } from '@solana/web3.js';

export const loadLamportsBalance = async ({
	address,
	token: { network }
}: {
	address: SolAddress;
	token: Token;
}): Promise<Lamports> => {
	if (!isSolNetwork(network)) {
		return lamports(0n);
	}

	const {
		rpc: { httpUrl }
	} = network;

	const { getBalance } = createSolanaRpc(httpUrl);

	const wallet = solAddress(address);
	const { value: balance } = await getBalance(wallet).send();

	return balance;
};

export const loadSolBalance = async ({
	address,
	token
}: {
	address: SolAddress;
	token: Token;
}): Promise<ResultSuccess> => {
	const { id: tokenId } = token;

	try {
		const balance = await loadLamportsBalance({ address, token });

		balancesStore.set({ tokenId, data: { data: BigNumber.from(balance), certified: false } });

		return { success: true };
	} catch (err: unknown) {
		balancesStore.reset(tokenId);

		// We don't want to disrupt the user experience if we can't load the balance.
		console.error(`Error fetching ${tokenId.description} balance data:`, err);

		return { success: false };
	}
};
