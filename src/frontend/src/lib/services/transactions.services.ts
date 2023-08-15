import { transactions as transactionsProviders } from '$lib/providers/etherscan.providers';
import { addressStore } from '$lib/stores/address.store';
import { toasts } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async () => {
	const address = get(addressStore);

	if (isNullish(address)) {
		// TODO: throw error?
		return;
	}

	try {
		const transactions = await transactionsProviders(address);
		transactionsStore.add(transactions);
	} catch (err: unknown) {
		transactionsStore.reset();

		toasts.error({
			text: 'Error while loading the transactions',
			detail: err
		});
	}
};
