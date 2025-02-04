import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import {
	mockSolRpcReceiveTransaction,
	mockSolRpcSendToMyselfTransaction,
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
				from: accountKeys[0].pubkey,
				to: accountKeys[1].pubkey,
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
				from: accountKeys[0].pubkey,
				to: accountKeys[1].pubkey,
				type: 'send',
				status: 'finalized',
				value: 150000000n,
				timestamp: blockTime
			});
		});

		it('should map a transaction from my wallet to my wallet correctly', () => {
			const {
				transaction: {
					signatures,
					message: { accountKeys }
				},
				meta,
				blockTime
			} = mockSolRpcSendToMyselfTransaction;

			const myAddress = accountKeys[0];

			const result = mapSolTransactionUi({
				transaction: mockSolRpcSendToMyselfTransaction,
				address: myAddress.pubkey
			});

			expect(result).toEqual({
				id: signatures[0],
				fee: meta?.fee,
				from: myAddress.pubkey,
				to: myAddress.pubkey,
				type: 'send',
				status: 'finalized',
				value: 0n,
				timestamp: blockTime
			});
		});
	});
});
