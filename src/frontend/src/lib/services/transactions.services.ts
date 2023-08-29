import { Token } from '$lib/enums/token';
import { transactions as transactionsProviders } from '$lib/providers/etherscan.providers';
import { addressStore } from '$lib/stores/address.store';
import { toastsError } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async (): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'ETH address is unknown.' }
		});

		return { success: false };
	}

	try {
		const transactions = await transactionsProviders(address);
		transactionsStore.set({ token: Token.ETHEREUM, transactions });
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
