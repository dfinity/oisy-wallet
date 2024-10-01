import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { expect } from 'vitest';
import { btcAddress, btcTransaction, btcTransactionUi } from '../../mocks/btc.mock';

describe('mapBtcTransaction', () => {
	it('should map correctly when receive transaction is pending', () => {
		const result = mapBtcTransaction({ transaction: btcTransaction, btcAddress });
		const expectedResult = {
			...btcTransactionUi,
			blockNumber: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when receive transaction is confirmed', () => {
		const transaction = {
			...btcTransaction,
			block_index: btcTransactionUi.blockNumber
		} as BitcoinTransaction;

		const result = mapBtcTransaction({ transaction, btcAddress });

		expect(result).toEqual(btcTransactionUi);
	});

	it('should map correctly when send transaction is pending', () => {
		const transaction = {
			...btcTransaction,
			inputs: [...btcTransaction.inputs, { prev_out: { addr: btcAddress } }]
		} as BitcoinTransaction;
		const result = mapBtcTransaction({ transaction, btcAddress });
		const expectedResult = {
			...btcTransactionUi,
			from: btcAddress,
			to: btcTransaction.out[0].addr,
			value: BigInt(btcTransaction.out[0].value),
			type: 'send',
			blockNumber: undefined,
			status: 'pending'
		};

		expect(result).toEqual(expectedResult);
	});

	it('should map correctly when send transaction is confirmed', () => {
		const transaction = {
			...btcTransaction,
			block_index: btcTransactionUi.blockNumber,
			inputs: [...btcTransaction.inputs, { prev_out: { addr: btcAddress } }]
		} as BitcoinTransaction;
		const result = mapBtcTransaction({ transaction, btcAddress });
		const expectedResult = {
			...btcTransactionUi,
			from: btcAddress,
			to: btcTransaction.out[0].addr,
			value: BigInt(btcTransaction.out[0].value),
			type: 'send'
		};

		expect(result).toEqual(expectedResult);
	});
});
