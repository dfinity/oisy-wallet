import { transactions as transactionsProviders } from '$lib/providers/etherscan.providers';
import { toasts } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import { get } from 'svelte/store';

export const loadTransactions = async ({ address }: { address: ECDSA_PUBLIC_KEY }) => {
	const currentTransactionsStore = get(transactionsStore);

	// We load the transactions once per session
	if (currentTransactionsStore.length > 0) {
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
