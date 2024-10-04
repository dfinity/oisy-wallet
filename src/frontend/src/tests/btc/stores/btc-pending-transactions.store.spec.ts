import { pendingTransactionsStore } from '$btc/stores/btc-pending-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';

const pendingTransactionMock1 = {
	txid: new Uint8Array([1, 2, 3]),
	utxos: [
		{
			height: 100,
			value: BigInt(5000),
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
			value: BigInt(6000),
			outpoint: {
				txid: new Uint8Array([4, 5, 6]),
				vout: 1
			}
		}
	]
};

describe('BtcPendingTransactionsStore', () => {
	beforeEach(() => {
		pendingTransactionsStore.reset();
	});

	it('should initialize with an empty store', () => {
		const storeData = get(pendingTransactionsStore);
		expect(storeData).toEqual({});
	});

	it('should add pending transactions to a specific address', () => {
		const address = 'test-address';
		const pendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		pendingTransactionsStore.setPendingTransactions({ address, pendingTransactions });

		const storeData = get(pendingTransactionsStore);
		expect(storeData[address].data).toEqual(pendingTransactions);
	});

	it('should set certified to `true`', () => {
		const address = 'test-address';
		const pendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		pendingTransactionsStore.setPendingTransactions({ address, pendingTransactions });

		const storeData = get(pendingTransactionsStore);
		expect(storeData[address].certified).toEqual(true);
	});

	it('should update pending transactions for an existing address', () => {
		const address = 'test-address';
		const initialPendingTransactions: Array<PendingTransaction> = [pendingTransactionMock1];

		const newPendingTransactions: Array<PendingTransaction> = [pendingTransactionMock2];

		pendingTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions: initialPendingTransactions
		});

		pendingTransactionsStore.setPendingTransactions({
			address,
			pendingTransactions: newPendingTransactions
		});

		const storeData = get(pendingTransactionsStore);
		expect(storeData[address].data).toEqual(newPendingTransactions);
	});

	it('should update pending transactions for an different addresses', () => {
		const address1 = 'test-address-2';
		const address2 = 'test-address-1';
		const pendingTransactions1: Array<PendingTransaction> = [pendingTransactionMock1];

		const pendingTransactions2: Array<PendingTransaction> = [pendingTransactionMock2];

		pendingTransactionsStore.setPendingTransactions({
			address: address1,
			pendingTransactions: pendingTransactions1
		});

		pendingTransactionsStore.setPendingTransactions({
			address: address2,
			pendingTransactions: pendingTransactions2
		});

		const storeData = get(pendingTransactionsStore);
		expect(storeData[address1].data).toEqual(pendingTransactions1);
		expect(storeData[address2].data).toEqual(pendingTransactions2);
	});
});
