import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { mockBtcAddress, mockBtcTransaction, mockBtcTransactionUi } from '$tests/mocks/btc.mock';
import { expect } from 'vitest';

describe('mapBtcTransaction', () => {
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
		const expectedResult = { ...mockBtcTransactionUi, status: 'unconfirmed' };

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

		expect(result).toEqual(mockBtcTransactionUi);
	});

	it('should map correctly when send transaction is pending', () => {
		const transaction = {
			...mockBtcTransaction,
			inputs: [...mockBtcTransaction.inputs, { prev_out: { addr: mockBtcAddress } }]
		} as BitcoinTransaction;
		const result = mapBtcTransaction({
			transaction,
			btcAddress: mockBtcAddress,
			latestBitcoinBlockHeight: 1
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			from: mockBtcAddress,
			to: mockBtcTransaction.out[0].addr,
			value: BigInt(mockBtcTransaction.out[0].value),
			type: 'send',
			blockNumber: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is unconfirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber,
			inputs: [...mockBtcTransaction.inputs, { prev_out: { addr: mockBtcAddress } }]
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
			from: mockBtcAddress,
			to: mockBtcTransaction.out[0].addr,
			value: BigInt(mockBtcTransaction.out[0].value),
			type: 'send'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is confirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber,
			inputs: [...mockBtcTransaction.inputs, { prev_out: { addr: mockBtcAddress } }]
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
			value: BigInt(mockBtcTransaction.out[0].value),
			type: 'send'
		};

		expect(result).toEqual(expectedResult);
	});
});
