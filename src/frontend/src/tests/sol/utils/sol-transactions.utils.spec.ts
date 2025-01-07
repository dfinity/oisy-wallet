import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import {
	mockSolRpcReceiveTransaction,
	mockSolRpcSendTransaction
} from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { describe, expect, it } from 'vitest';

describe('sol-transactions.utils', () => {
	describe('mapSolTransactionUi', () => {
		it('should map a receive transaction correctly', () => {
			const result = mapSolTransactionUi({
				transaction: mockSolRpcReceiveTransaction,
				address: mockSolAddress
			});

			const {
				transaction: {
					signatures,
					message: { accountKeys }
				},
				meta,
				blockTime
			} = mockSolRpcReceiveTransaction;

			expect(result).toEqual({
				id: signatures[0],
				fee: meta?.fee,
				from: accountKeys[0],
				to: accountKeys[1],
				type: 'receive',
				status: 'finalized',
				value: 5000000000n,
				timestamp: blockTime
			});
		});

		it('should map a send transaction correctly', () => {
			const result = mapSolTransactionUi({
				transaction: mockSolRpcSendTransaction,
				address: mockSolAddress
			});

			const {
				transaction: {
					signatures,
					message: { accountKeys }
				},
				meta,
				blockTime
			} = mockSolRpcSendTransaction;

			expect(result).toEqual({
				id: signatures[0],
				fee: meta?.fee,
				from: accountKeys[0],
				to: accountKeys[1],
				type: 'send',
				status: 'finalized',
				value: -150000000n,
				timestamp: blockTime
			});
		});
	});
});
