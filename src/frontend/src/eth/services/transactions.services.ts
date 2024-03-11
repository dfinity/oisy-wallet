import { erc20Tokens } from '$eth/derived/erc20.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { transactions as transactionsRest } from '$eth/rest/etherscan.rest';
import { transactionsStore } from '$eth/stores/transactions.store';
import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
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
	if (tokenId === ETHEREUM_TOKEN_ID) {
		return loadEthTransactions({ networkId });
	}

	return loadErc20Transactions({ tokenId });
};

const loadEthTransactions = async ({
	networkId
}: {
	networkId: NetworkId;
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
		transactionsStore.set({ tokenId: ETHEREUM_TOKEN_ID, transactions });
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
	tokenId
}: {
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
