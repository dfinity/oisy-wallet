import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { transactions as transactionsProviders } from '$lib/providers/etherscan.providers';
import { transactions as transactionsRest } from '$lib/rest/etherscan.rest';
import { addressStore } from '$lib/stores/address.store';
import { toastsError } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import type { TokenId } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async (tokenId: TokenId): Promise<{ success: boolean }> => {
	const existingTransactions = get(transactionsStore)[tokenId];

	// We load only once
	if (nonNullish(existingTransactions)) {
		return { success: true };
	}

	if (tokenId === ETHEREUM_TOKEN_ID) {
		return loadEthTransactions();
	}

	return loadErc20Transactions({ tokenId });
};

const loadEthTransactions = async (): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'Address is unknown.' }
		});

		return { success: false };
	}

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
