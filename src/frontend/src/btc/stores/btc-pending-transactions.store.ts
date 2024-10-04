import type { PendingTransaction } from '$declarations/backend/backend.did';
import { writable, type Readable } from 'svelte/store';

// The endpoint can't be called with a query. Therefore, the information is always certified with an update call.
type Address = string;
type BtcPendingTransactionsStoreData = Record<Address, Array<PendingTransaction>>;

interface BtcPendingTransactionsStore extends Readable<BtcPendingTransactionsStoreData> {
	setPendingTransactions: (params: {
		address: Address;
		pendingTransactions: Array<PendingTransaction>;
	}) => void;
	reset: () => void;
}

/**
 * Bitcoin transations take time to confirm.
 * While a transaction is pending, its utxos cannot be used, but they might still be available.
 * Instead of trying ot be smart, for now we'll disable transactions until they are confirmed.
 *
 * This store is used to keep track of pending transactions.
 */
const initBtcPendingTransactionsStore = (): BtcPendingTransactionsStore => {
	const { update, set, subscribe } = writable<BtcPendingTransactionsStoreData>({});

	return {
		subscribe,
		setPendingTransactions({
			address,
			pendingTransactions: pendingTransactions
		}: {
			address: Address;
			pendingTransactions: Array<PendingTransaction>;
		}) {
			update((state) => ({
				...state,
				[address]: pendingTransactions
			}));
		},
		reset() {
			set({});
		}
	};
};

export const pendingTransactionsStore = initBtcPendingTransactionsStore();
