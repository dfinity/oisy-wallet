import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import type { BtcTransactionStatus } from '$btc/types/btc';
import { mapBtcTransaction, sortBtcTransactions } from '$btc/utils/btc-transactions.utils';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { mockBtcAddress, mockBtcTransaction, mockBtcTransactionUi } from '$tests/mocks/btc.mock';
import { describe, expect } from 'vitest';

describe('mapBtcTransaction', () => {
	const sendTransaction = {
		...mockBtcTransaction,
		inputs: [
			{
				...mockBtcTransaction.inputs[0],
				prev_out: { ...mockBtcTransaction.inputs[0].prev_out, addr: mockBtcAddress }
			}
		]
	} as BitcoinTransaction;
	const sendTransactionFee =
		mockBtcTransaction.inputs[0].prev_out.value -
		mockBtcTransaction.out.reduce((acc, { value }) => acc + value, 0);
	const sendTransactionValue = BigInt(mockBtcTransaction.out[0].value + sendTransactionFee);

	it('should map correctly when receive transaction is pending', () => {
		const result = mapBtcTransaction({
			transaction: mockBtcTransaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight: 1
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			blockNumber: undefined,
			confirmations: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when receive transaction is unconfirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber
		} as BitcoinTransaction;
		const result = mapBtcTransaction({
			transaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight:
				(mockBtcTransactionUi.blockNumber ?? 0) + UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			status: 'unconfirmed',
			confirmations: UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when receive transaction is confirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber
		} as BitcoinTransaction;
		const result = mapBtcTransaction({
			transaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight:
				(mockBtcTransactionUi.blockNumber ?? 0) + CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		});

		const expectedResult = {
			...mockBtcTransactionUi,
			confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is pending', () => {
		const result = mapBtcTransaction({
			transaction: sendTransaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight: 1
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			from: mockBtcAddress,
			to: mockBtcTransaction.out[0].addr,
			value: sendTransactionValue,
			type: 'send',
			blockNumber: undefined,
			confirmations: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is unconfirmed', () => {
		const transaction = {
			...sendTransaction,
			block_index: mockBtcTransactionUi.blockNumber
		} as BitcoinTransaction;
		const result = mapBtcTransaction({
			transaction: transaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight:
				(mockBtcTransactionUi.blockNumber ?? 0) + UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			status: 'unconfirmed',
			from: mockBtcAddress,
			to: mockBtcTransaction.out[0].addr,
			value: sendTransactionValue,
			type: 'send',
			confirmations: UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is confirmed', () => {
		const transaction = {
			...sendTransaction,
			block_index: mockBtcTransactionUi.blockNumber
		} as BitcoinTransaction;
		const result = mapBtcTransaction({
			transaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight:
				(mockBtcTransactionUi.blockNumber ?? 0) + CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			from: mockBtcAddress,
			to: mockBtcTransaction.out[0].addr,
			value: sendTransactionValue,
			type: 'send',
			confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
		};

		expect(result).toEqual(expectedResult);
	});
});

describe('sortBtcTransactions', () => {
	// TODO: add more test cases
	it('sorts transactions correctly', () => {
		const pendingTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 1n,
			status: 'pending' as BtcTransactionStatus
		};
		const pendingTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 2n,
			status: 'pending' as BtcTransactionStatus
		};
		const unconfirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 3n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const unconfirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 4n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const confirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 5n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const confirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 6n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const transactionsToSort = [
			confirmedTransaction2,
			pendingTransaction1,
			unconfirmedTransaction2,
			pendingTransaction2,
			confirmedTransaction1,
			unconfirmedTransaction1
		];
		const expectedResult = [
			pendingTransaction2,
			pendingTransaction1,
			unconfirmedTransaction2,
			unconfirmedTransaction1,
			confirmedTransaction2,
			confirmedTransaction1
		];

		expect(
			transactionsToSort.sort((transactionA, transactionB) =>
				sortBtcTransactions({ transactionA, transactionB })
			)
		).toStrictEqual(expectedResult);
	});
});
