import type { PendingTransaction } from '$declarations/backend/backend.did';
import type { AlwaysCertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

type Address = string;
type BtcPendingSentTransactionsStoreData = Record<
	Address,
	// The endpoint can't be called with a query. Therefore, the information is always certified with an update call.
	// `null` is used to indicate that the data is not available. Due to an error or connection issues.
	AlwaysCertifiedData<Array<PendingTransaction> | null>
>;

interface BtcPendingSentTransactionsStore extends Readable<BtcPendingSentTransactionsStoreData> {
	setPendingTransactions: (params: {
		address: Address;
		pendingTransactions: Array<PendingTransaction>;
	}) => void;

	setPendingTransactionsError(params: { address: Address }): void;

	reset: () => void;
}

/**
 * Bitcoin transations take time to confirm.
 * After a user sends a transaction, while a transaction is pending,
 * its utxos cannot be used, but they might still be available.
 * Instead of trying ot be smart, for now we'll disable transactions until they are confirmed.
 *
 * This store is used to keep track of pending transactions.
 */
const initBtcPendingSentTransactionsStore = (): BtcPendingSentTransactionsStore => {
	const { update, set, subscribe } = writable<BtcPendingSentTransactionsStoreData>({});

	return {
		subscribe,
		setPendingTransactions: ({
			address,
			pendingTransactions
		}: {
			address: Address;
			pendingTransactions: Array<PendingTransaction>;
		}) => {
			update((state) => ({
				...state,
				[address]: {
					certified: true,
					data: pendingTransactions
				}
			}));
		},
		setPendingTransactionsError: ({ address }: { address: Address }) => {
			update((state) => ({
				...state,
				[address]: {
					certified: true,
					data: null
				}
			}));
		},
		reset: () => {
			set({});
		}
	};
};

export const btcPendingSentTransactionsStore = initBtcPendingSentTransactionsStore();
