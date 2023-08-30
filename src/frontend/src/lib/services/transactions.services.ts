import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { transactions as transactionsProviders } from '$lib/providers/etherscan.providers';
import { transactions as transactionsRest } from '$lib/rest/etherscan.rest';
import { addressStore } from '$lib/stores/address.store';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { toastsError } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { TokenId } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async (tokenId: TokenId): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'Address is unknown.' }
		});

		return { success: false };
	}

	const existingTransactions = get(transactionsStore)[tokenId];

	// We load only once
	if (nonNullish(existingTransactions)) {
		return { success: true };
	}

	if (tokenId === ETHEREUM_TOKEN_ID) {
		return loadEthTransactions({ address });
	}

	return loadErc20Transactions({ address, tokenId });
};

export const loadEthTransactions = async ({
	address
}: {
	address: ECDSA_PUBLIC_KEY;
}): Promise<{ success: boolean }> => {
	try {
		const transactions = await transactionsProviders(address);
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
	tokenId,
	address
}: {
	tokenId: TokenId;
	address: ECDSA_PUBLIC_KEY;
}): Promise<{ success: boolean }> => {
	const tokens = get(erc20TokensStore);
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
