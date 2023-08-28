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

		// console.log(
		// 	'Test',
		// 	transactions,
		// 	(await transactionsProviders('0x9821888988289d6cB3C403223B2f922E59B3239a')).find(
		// 		({ blockNumber }) => (blockNumber = 3544347)
		// 	)
		// );

		// https://sepolia.etherscan.io/address/0x40d348b2601a2c5504a29aeac9d072f4ec7d78b7
		console.log(
			'yolo',
			(await transactionsProviders('0x40d348b2601A2c5504a29AeAc9d072f4eC7d78b7')).filter(
				({ from, to, hash }) => {
					console.log(hash);
					return from.toLowerCase() === '0xCc03CD10f93Fd9570f1DF6A71E9157A10f282eD2'.toLowerCase();
				}
			)
		);

		transactionsStore.set(transactions);
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
