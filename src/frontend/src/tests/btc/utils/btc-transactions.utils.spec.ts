import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { expect } from 'vitest';
import { mockBtcAddress, mockBtcTransaction, mockBtcTransactionUi } from '../../mocks/btc.mock';

describe('mapBtcTransaction', () => {
	it('should map correctly when receive transaction is pending', () => {
		const result = mapBtcTransaction({
			transaction: mockBtcTransaction,
			btcAddress: mockBtcAddress
		});
		const expectedResult = {
			...mockBtcTransactionUi,
			blockNumber: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when receive transaction is confirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber
		} as BitcoinTransaction;

		const result = mapBtcTransaction({ transaction, btcAddress: mockBtcAddress });

		expect(result).toEqual(mockBtcTransactionUi);
	});

	it('should map correctly when send transaction is pending', () => {
		const transaction = {
			...mockBtcTransaction,
			inputs: [...mockBtcTransaction.inputs, { prev_out: { addr: mockBtcAddress } }]
		} as BitcoinTransaction;
		const result = mapBtcTransaction({ transaction, btcAddress: mockBtcAddress });
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

	it('should map correctly when send transaction is confirmed', () => {
		const transaction = {
			...mockBtcTransaction,
			block_index: mockBtcTransactionUi.blockNumber,
			inputs: [...mockBtcTransaction.inputs, { prev_out: { addr: mockBtcAddress } }]
		} as BitcoinTransaction;
		const result = mapBtcTransaction({ transaction, btcAddress: mockBtcAddress });
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
