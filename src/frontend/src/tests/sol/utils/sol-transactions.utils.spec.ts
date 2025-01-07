import {
	mockSolRpcReceiveTransaction,
	mockSolRpcSendTransaction
} from '$tests/mocks/sol-transactions.mock';
import { describe, expect, it } from 'vitest';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-transactions.utils', () => {
	describe('mapSolTransactionUi', () => {
		it('should map a receive transaction correctly', () => {
			const result = mapSolTransactionUi({ transaction: mockSolRpcReceiveTransaction, address: mockSolAddress });

			expect(result).toEqual({
				id: mockSolRpcReceiveTransaction.transaction.signatures[0],
				fee: mockSolRpcReceiveTransaction.meta?.fee,
				from: mockSolRpcReceiveTransaction.transaction.message.accountKeys[0],
				to: mockSolRpcReceiveTransaction.transaction.message.accountKeys[1],
				type: 'receive',
				status: 'finalized',
				value: 5000000000n,
				timestamp: mockSolRpcReceiveTransaction.blockTime
			});
		});

		it('should map a send transaction correctly', () => {
			const result = mapSolTransactionUi({ transaction: mockSolRpcSendTransaction, address: mockSolAddress });

			expect(result).toEqual({
				id: mockSolRpcSendTransaction.transaction.signatures[0],
				fee: mockSolRpcSendTransaction.meta?.fee,
				from: mockSolRpcSendTransaction.transaction.message.accountKeys[0],
				to: mockSolRpcSendTransaction.transaction.message.accountKeys[1],
				type: 'send',
				status: 'finalized',
				value: -150000000n,
				timestamp: mockSolRpcSendTransaction.blockTime
			});
		});
	});
});
