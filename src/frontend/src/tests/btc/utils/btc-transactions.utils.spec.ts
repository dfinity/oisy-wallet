import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { mockBtcAddress, mockBtcTransaction, mockBtcTransactionUi } from '$tests/mocks/btc.mock';
import { expect } from 'vitest';

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
			confirmations: UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
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
			confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
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
			confirmations: UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
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
			confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
		};

		expect(result).toEqual(expectedResult);
	});
});
