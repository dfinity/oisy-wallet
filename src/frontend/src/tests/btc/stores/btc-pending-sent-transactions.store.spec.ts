import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { get } from 'svelte/store';

const pendingTransactionMock1 = {
	txid: new Uint8Array([1, 2, 3]),
	utxos: [
		{
			height: 100,
			value: 5000n,
			outpoint: {
				txid: new Uint8Array([1, 2, 3]),
				vout: 0
			}
		}
	]
};
const pendingTransactionMock2 = {
	txid: new Uint8Array([4, 5, 6]),
	utxos: [
		{
			height: 101,
			value: 6000n,
			outpoint: {
				txid: new Uint8Array([4, 5, 6]),
				vout: 1
			}
		}
	]
};

describe('btcPendingSentTransactionsStore', () => {
	beforeEach(() => {
		btcPendingSentTransactionsStore.reset();
	});

	it('should initialize with an empty store', () => {
		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData).toEqual({});
	});

	it('should add pending transactions to a specific address', () => {
		const address = 'test-address';
		const pendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		btcPendingSentTransactionsStore.setPendingTransactions({ address, pendingTransactions });

		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData[address].data).toEqual(pendingTransactions);
	});

	it('should set pending transactions to `null` for a specific address', () => {
		const address = 'test-address';
		btcPendingSentTransactionsStore.setPendingTransactionsError({ address });

		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData[address].data).toBeNull();
	});

	it('should reset pending transactions to a `null`', () => {
		const address = 'test-address';
		const pendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		btcPendingSentTransactionsStore.setPendingTransactions({ address, pendingTransactions });

		expect(get(btcPendingSentTransactionsStore)[address].data).toEqual(pendingTransactions);

		btcPendingSentTransactionsStore.setPendingTransactionsError({ address });

		expect(get(btcPendingSentTransactionsStore)[address].data).toBeNull();
	});

	it('should set certified to `true`', () => {
		const address = 'test-address';
		const pendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		btcPendingSentTransactionsStore.setPendingTransactions({ address, pendingTransactions });

		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData[address].certified).toBeTruthy();
	});

	it('should update pending transactions for an existing address', () => {
		const address = 'test-address';
		const initialPendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		const newPendingTransactions: Array<PendingTransaction> = [pendingTransactionMock2];

		btcPendingSentTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions: initialPendingTransactions
		});

		btcPendingSentTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions: newPendingTransactions
		});

		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData[address].data).toEqual(newPendingTransactions);
	});

	it('should update pending transactions for an different addresses', () => {
		const address1 = 'test-address-2';
		const address2 = 'test-address-1';
		const pendingTransactions1: Array<PendingTransaction> = [pendingTransactionMock1];

		const pendingTransactions2: Array<PendingTransaction> = [pendingTransactionMock2];

		btcPendingSentTransactionsStore.setPendingTransactions({
			address: address1,
			pendingTransactions: pendingTransactions1
		});

		btcPendingSentTransactionsStore.setPendingTransactions({
			address: address2,
			pendingTransactions: pendingTransactions2
		});

		const storeData = get(btcPendingSentTransactionsStore);

		expect(storeData[address1].data).toEqual(pendingTransactions1);
		expect(storeData[address2].data).toEqual(pendingTransactions2);
	});
});
