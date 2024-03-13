import { ETHEREUM_TOKEN_IDS } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { etherscanRests } from '$eth/rest/etherscan.rest';
import { transactionsStore } from '$eth/stores/transactions.store';
import { address as addressStore } from '$lib/derived/address.derived';
import { toastsError } from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async ({
	networkId,
	tokenId
}: {
	tokenId: TokenId;
	networkId: NetworkId;
}): Promise<{ success: boolean }> => {
	if (ETHEREUM_TOKEN_IDS.includes(tokenId)) {
		return loadEthTransactions({ networkId, tokenId });
	}

	return loadErc20Transactions({ networkId, tokenId });
};

const loadEthTransactions = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'Address is unknown.' }
		});

		return { success: false };
	}

	try {
		const { transactions: transactionsProviders } = etherscanProviders(networkId);
		const transactions = await transactionsProviders({ address });
		transactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		transactionsStore.reset();

		toastsError({
			msg: { text: 'Error while loading the transactions.' },
			err
		});
		return { success: false };
	}

	return { success: true };
};

export const loadErc20Transactions = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'Address is unknown.' }
		});

		return { success: false };
	}

	const tokens = get(erc20Tokens);
	const token = tokens.find(({ id }) => id === tokenId);

	if (isNullish(token)) {
		toastsError({
			msg: { text: 'Token not found. Transactions cannot be loaded.' }
		});

		return { success: false };
	}

	try {
		const { transactions: transactionsRest } = etherscanRests(networkId);
		const transactions = await transactionsRest({ contract: token, address });
		transactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		transactionsStore.reset();

		toastsError({
			msg: { text: `Error while loading the ${token.symbol} transactions.` },
			err
		});
		return { success: false };
	}

	return { success: true };
};
