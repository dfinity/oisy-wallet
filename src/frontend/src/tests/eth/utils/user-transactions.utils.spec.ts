import type { UserTransaction } from '$declarations/backend/backend.did';
import {
	ETH_FINALITY_BLOCKS,
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Transaction } from '$lib/types/transaction';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	extractMockEvmTransactionData,
	mockEthMappedEvmTransactionData,
	mockEthMappedUserTransaction,
	mockEthTransaction
} from '$tests/mocks/user-transactions.mock';
import { toNullable } from '@dfinity/utils';

describe('user-transactions.utils', () => {
	describe('mapTransactionToUserTransaction', () => {
		it('should correctly map a full Transaction to UserTransaction', () => {
			const result = mapTransactionToUserTransaction(mockEthTransaction);

			expect(result).toEqual(mockEthMappedUserTransaction);
		});

		it('should throw when hash is nullish', () => {
			const { hash: _, ...transactionWithoutHash } = mockEthTransaction;

			expect(() => mapTransactionToUserTransaction(transactionWithoutHash as Transaction)).toThrow(
				'Cannot store a transaction without a hash'
			);
		});

		it('should default blockNumber and timestamp to 0n when undefined', () => {
			const { blockNumber: _, timestamp: __, ...rest } = mockEthTransaction;
			const transaction: Transaction = { ...rest, hash: '0xabc', from: mockEthAddress };

			const result = mapTransactionToUserTransaction(transaction);

			expect(result.block_index).toBe(ZERO);
			expect(result.timestamp).toBe(ZERO);
		});

		it('should map optional "to" as empty when undefined', () => {
			const transaction: Transaction = { ...mockEthTransaction, to: undefined };

			const result = mapTransactionToUserTransaction(transaction);

			expect(result.to).toEqual(toNullable());
		});

		it('should map optional chainId, nonce, and tokenId as empty when undefined', () => {
			const transaction = {
				...mockEthTransaction,
				chainId: undefined,
				nonce: undefined,
				tokenId: undefined
			} as unknown as Transaction;

			const result = mapTransactionToUserTransaction(transaction);
			const evm = extractMockEvmTransactionData(result.network_data);

			expect(evm.chain_id).toEqual(toNullable());
			expect(evm.nonce).toEqual(toNullable());
			expect(evm.nft_token_id).toEqual(toNullable());
		});

		it('should map gasPrice and gasUsed as empty when undefined', () => {
			const transaction: Transaction = {
				...mockEthTransaction,
				gasPrice: undefined,
				gasUsed: undefined
			};

			const result = mapTransactionToUserTransaction(transaction);
			const evm = extractMockEvmTransactionData(result.network_data);

			expect(evm.gas_price).toEqual(toNullable());
			expect(evm.gas_used).toEqual(toNullable());
		});

		it('should map gasPrice and gasUsed when provided', () => {
			const transaction: Transaction = {
				...mockEthTransaction,
				gasPrice: 100n,
				gasUsed: 21000n
			};

			const result = mapTransactionToUserTransaction(transaction);
			const evm = extractMockEvmTransactionData(result.network_data);

			expect(evm.gas_price).toEqual(toNullable(100n));
			expect(evm.gas_used).toEqual(toNullable(21000n));
		});

		it('should convert tokenId to bigint', () => {
			const transaction: Transaction = { ...mockEthTransaction, tokenId: 42 };

			const result = mapTransactionToUserTransaction(transaction);
			const evm = extractMockEvmTransactionData(result.network_data);

			expect(evm.nft_token_id).toEqual(toNullable(42n));
		});
	});

	describe('mapUserTransactionToTransaction', () => {
		it('should correctly map a UserTransaction to Transaction', () => {
			const result = mapUserTransactionToTransaction(mockEthMappedUserTransaction);

			expect(result).toEqual(mockEthTransaction);
		});

		it('should throw when network_data is not Evm', () => {
			const transaction = {
				...mockEthMappedUserTransaction,
				network_data: { Solana: {} }
			} as unknown as UserTransaction;

			expect(() => mapUserTransactionToTransaction(transaction)).toThrow(
				'Expected Evm network data for ETH transaction mapping'
			);
		});

		it('should map optional "to" as undefined when empty', () => {
			const transaction: UserTransaction = { ...mockEthMappedUserTransaction, to: toNullable() };

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.to).toBeUndefined();
		});

		it('should default chainId to ZERO when empty', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: { ...mockEthMappedEvmTransactionData, chain_id: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.chainId).toBe(ZERO);
		});

		it('should default nonce to 0 when empty', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: { ...mockEthMappedEvmTransactionData, nonce: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.nonce).toBe(0);
		});

		it('should default gasLimit to ZERO when empty', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: { ...mockEthMappedEvmTransactionData, gas_limit: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.gasLimit).toBe(ZERO);
		});

		it('should default data to empty string when empty', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: { ...mockEthMappedEvmTransactionData, data: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.data).toBe('');
		});

		it('should map gasPrice and gasUsed when provided', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: {
						...mockEthMappedEvmTransactionData,
						gas_price: toNullable(100n),
						gas_used: toNullable(21000n)
					}
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.gasPrice).toBe(100n);
			expect(result.gasUsed).toBe(21000n);
		});

		it('should convert nft_token_id to number', () => {
			const transaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: {
						...mockEthMappedEvmTransactionData,
						nft_token_id: toNullable(42n)
					}
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.tokenId).toBe(42);
		});
	});

	describe('round-trip mapping', () => {
		it('should preserve data through Transaction -> UserTransaction -> Transaction', () => {
			const userTransaction = mapTransactionToUserTransaction(mockEthTransaction);
			const result = mapUserTransactionToTransaction(userTransaction);

			expect(result.hash).toBe(mockEthTransaction.hash);
			expect(result.blockNumber).toBe(mockEthTransaction.blockNumber);
			expect(result.timestamp).toBe(mockEthTransaction.timestamp);
			expect(result.from).toBe(mockEthTransaction.from);
			expect(result.to).toBe(mockEthTransaction.to);
			expect(result.value).toBe(mockEthTransaction.value);
			expect(result.chainId).toBe(mockEthTransaction.chainId);
			expect(result.nonce).toBe(mockEthTransaction.nonce);
			expect(result.gasLimit).toBe(mockEthTransaction.gasLimit);
			expect(result.data).toBe(mockEthTransaction.data);
		});

		it('should preserve data through UserTransaction -> Transaction -> UserTransaction', () => {
			expect(mockEthMappedUserTransaction.network_data).toHaveProperty('Evm');

			const fullUserTransaction: UserTransaction = {
				...mockEthMappedUserTransaction,
				network_data: {
					Evm: {
						...mockEthMappedEvmTransactionData,
						gas_price: toNullable(100n),
						gas_used: toNullable(21000n),
						nft_token_id: toNullable(42n)
					}
				}
			};

			const transaction = mapUserTransactionToTransaction(fullUserTransaction);
			const result = mapTransactionToUserTransaction(transaction);

			expect(result).toEqual(fullUserTransaction);
		});
	});

	describe('ETH_FINALITY_BLOCKS', () => {
		it('should be 64', () => {
			expect(ETH_FINALITY_BLOCKS).toBe(64);
		});
	});

	describe('isTransactionFinalized', () => {
		it('should return true when block difference equals ETH_FINALITY_BLOCKS', () => {
			expect(
				isTransactionFinalized({
					blockNumber: 100,
					currentBlockNumber: 100 + ETH_FINALITY_BLOCKS
				})
			).toBeTruthy();
		});

		it('should return true when block difference exceeds ETH_FINALITY_BLOCKS', () => {
			expect(
				isTransactionFinalized({
					blockNumber: 100,
					currentBlockNumber: 100 + ETH_FINALITY_BLOCKS + 1000
				})
			).toBeTruthy();
		});

		it('should return false when block difference is less than ETH_FINALITY_BLOCKS', () => {
			expect(
				isTransactionFinalized({
					blockNumber: 100,
					currentBlockNumber: 100 + ETH_FINALITY_BLOCKS - 1
				})
			).toBeFalsy();
		});

		it('should return false when blockNumber is undefined', () => {
			expect(
				isTransactionFinalized({
					blockNumber: undefined,
					currentBlockNumber: 1000
				})
			).toBeFalsy();
		});

		it('should return true when blockNumber is 0 and currentBlockNumber is at least ETH_FINALITY_BLOCKS', () => {
			expect(
				isTransactionFinalized({
					blockNumber: 0,
					currentBlockNumber: ETH_FINALITY_BLOCKS
				})
			).toBeTruthy();
		});

		it('should return false when blockNumber equals currentBlockNumber', () => {
			expect(
				isTransactionFinalized({
					blockNumber: 500,
					currentBlockNumber: 500
				})
			).toBeFalsy();
		});
	});
});
