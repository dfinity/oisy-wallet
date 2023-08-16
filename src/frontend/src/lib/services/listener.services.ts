import type { WebSocketListener } from '$lib/providers/alchemy.providers';
import {
	getTransaction,
	initTransactionsListener as initTransactionsListenerProvider
} from '$lib/providers/alchemy.providers';
import { loadBalance } from '$lib/services/balance.services';
import { toastsError } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';

const processTransaction = async ({ hash }: { hash: string }) => {
	const transaction = await getTransaction(hash);

	if (isNullish(transaction)) {
		return;
	}

	transactionsStore.add([
		{
			...transaction,
			pendingTimestamp: Date.now()
		}
	]);

	const { wait, hash: transactionHash } = transaction;

	await wait();

	const minedTransaction = await getTransaction(transactionHash);

	if (isNullish(minedTransaction)) {
		toastsError({
			msg: { text: `Failed to load the mined transaction. Please reload the wallet dapp.` }
		});
		return;
	}

	// At least on Sepolia network we noticed that the timestamp was not provided when getting the transaction in this hook.
	// Therefore, as the transaction has just been mined and for simplicity reason, we display now timestamp if undefined.
	const { timestamp, ...rest } = minedTransaction;

	transactionsStore.update({
		...rest,
		timestamp: timestamp ?? Date.now() / 1000
	});

	// Reload balance as a transaction has been mined
	await loadBalance();
};

export const initTransactionsListener = (address: ECDSA_PUBLIC_KEY): WebSocketListener =>
	initTransactionsListenerProvider({
		address,
		listener: async (tx: { hash: string }) => await processTransaction(tx)
	});
