import type { UserTransaction } from '$declarations/backend/backend.did';
import {
	ETH_FINALITY_BLOCKS,
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Transaction } from '$lib/types/transaction';
import { bn1Bi, bn3Bi } from '$tests/mocks/balances.mock';
import { mockEthTransaction } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { toNullable } from '@dfinity/utils';

describe('user-transactions.utils', () => {
	const mockUserTransaction: UserTransaction = {
		id: '0x123456789',
		block_index: 123213n,
		timestamp: 123456789n,
		from: mockEthAddress,
		to: toNullable(mockEthAddress2),
		value: bn1Bi,
		network_data: {
			Evm: {
				chain_id: toNullable(1n),
				nonce: toNullable(123n),
				gas_limit: toNullable(bn3Bi),
				gas_price: toNullable(),
				gas_used: toNullable(),
				data: toNullable('0xabcdef'),
				nft_token_id: toNullable()
			}
		}
	};

	describe('mapTransactionToUserTransaction', () => {
		it('should correctly map a full Transaction to UserTransaction', () => {
			const result = mapTransactionToUserTransaction(mockEthTransaction);

			expect(result).toEqual(mockUserTransaction);
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

			expect(result.network_data.Evm.chain_id).toEqual(toNullable());
			expect(result.network_data.Evm.nonce).toEqual(toNullable());
			expect(result.network_data.Evm.nft_token_id).toEqual(toNullable());
		});

		it('should map gasPrice and gasUsed as empty when undefined', () => {
			const transaction: Transaction = {
				...mockEthTransaction,
				gasPrice: undefined,
				gasUsed: undefined
			};

			const result = mapTransactionToUserTransaction(transaction);

			expect(result.network_data.Evm.gas_price).toEqual(toNullable());
			expect(result.network_data.Evm.gas_used).toEqual(toNullable());
		});

		it('should map gasPrice and gasUsed when provided', () => {
			const transaction: Transaction = {
				...mockEthTransaction,
				gasPrice: 100n,
				gasUsed: 21000n
			};

			const result = mapTransactionToUserTransaction(transaction);

			expect(result.network_data.Evm.gas_price).toEqual(toNullable(100n));
			expect(result.network_data.Evm.gas_used).toEqual(toNullable(21000n));
		});

		it('should convert tokenId to bigint', () => {
			const transaction: Transaction = { ...mockEthTransaction, tokenId: 42 };

			const result = mapTransactionToUserTransaction(transaction);

			expect(result.network_data.Evm.nft_token_id).toEqual(toNullable(42n));
		});
	});

	describe('mapUserTransactionToTransaction', () => {
		it('should correctly map a UserTransaction to Transaction', () => {
			const result = mapUserTransactionToTransaction(mockUserTransaction);

			expect(result).toEqual({
				hash: '0x123456789',
				blockNumber: 123213,
				timestamp: 123456789,
				from: mockEthAddress,
				to: mockEthAddress2,
				value: bn1Bi,
				chainId: 1n,
				nonce: 123,
				gasLimit: bn3Bi,
				gasPrice: undefined,
				gasUsed: undefined,
				data: '0xabcdef',
				tokenId: undefined
			});
		});

		it('should throw when network_data is not Evm', () => {
			const transaction = {
				...mockUserTransaction,
				network_data: { Solana: {} }
			} as unknown as UserTransaction;

			expect(() => mapUserTransactionToTransaction(transaction)).toThrow(
				'Expected Evm network data for ETH transaction mapping'
			);
		});

		it('should map optional "to" as undefined when empty', () => {
			const transaction: UserTransaction = { ...mockUserTransaction, to: toNullable() };

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.to).toBeUndefined();
		});

		it('should default chainId to ZERO when empty', () => {
			const transaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: { ...mockUserTransaction.network_data.Evm, chain_id: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.chainId).toBe(ZERO);
		});

		it('should default nonce to 0 when empty', () => {
			const transaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: { ...mockUserTransaction.network_data.Evm, nonce: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.nonce).toBe(0);
		});

		it('should default gasLimit to ZERO when empty', () => {
			const transaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: { ...mockUserTransaction.network_data.Evm, gas_limit: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.gasLimit).toBe(ZERO);
		});

		it('should default data to empty string when empty', () => {
			const transaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: { ...mockUserTransaction.network_data.Evm, data: toNullable() }
				}
			};

			const result = mapUserTransactionToTransaction(transaction);

			expect(result.data).toBe('');
		});

		it('should map gasPrice and gasUsed when provided', () => {
			const transaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: {
						...mockUserTransaction.network_data.Evm,
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
				...mockUserTransaction,
				network_data: {
					Evm: {
						...mockUserTransaction.network_data.Evm,
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
			const fullUserTransaction: UserTransaction = {
				...mockUserTransaction,
				network_data: {
					Evm: {
						...mockUserTransaction.network_data.Evm,
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
