import type { UserTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import {
	isSolTransactionFinalized,
	mapSolTransactionToUserTransaction,
	mapUserTransactionToSolTransaction,
	requiresStoredSplOwnerRefresh,
	solBackendTokenId
} from '$sol/utils/user-transactions.utils';
import { mockSignature } from '$tests/mocks/sol-transactions.mock';
import {
	mockSolBackendUserTransaction,
	mockSolUserTransactionUi
} from '$tests/mocks/sol-user-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { toNullable } from '@dfinity/utils';
import { signature } from '@solana/kit';

describe('user-transactions.utils', () => {
	describe('mapSolTransactionToUserTransaction', () => {
		it('should correctly map a full SolTransactionUi to UserTransaction', () => {
			const result = mapSolTransactionToUserTransaction(mockSolUserTransactionUi);

			expect(result).toEqual({
				id: mockSolUserTransactionUi.id,
				block_index: BigInt(mockSolUserTransactionUi.blockNumber ?? 0),
				timestamp: BigInt(mockSolUserTransactionUi.timestamp ?? ZERO),
				from: mockSolUserTransactionUi.from,
				to: toNullable(mockSolUserTransactionUi.to),
				value: mockSolUserTransactionUi.value,
				network_data: {
					Sol: {
						fee: toNullable(mockSolUserTransactionUi.fee),
						from_owner: toNullable(mockSolUserTransactionUi.fromOwner),
						to_owner: toNullable(mockSolUserTransactionUi.toOwner)
					}
				}
			});
		});

		it('should default blockNumber to 0 when undefined', () => {
			const { blockNumber: _, ...rest } = mockSolUserTransactionUi;
			const tx: SolTransactionUi = { ...rest } as SolTransactionUi;

			const result = mapSolTransactionToUserTransaction(tx);

			expect(result.block_index).toBe(ZERO);
		});

		it('should default timestamp to ZERO when undefined', () => {
			const { timestamp: _, ...rest } = mockSolUserTransactionUi;
			const tx: SolTransactionUi = { ...rest } as SolTransactionUi;

			const result = mapSolTransactionToUserTransaction(tx);

			expect(result.timestamp).toBe(ZERO);
		});

		it('should map optional "to" as empty when undefined', () => {
			const tx: SolTransactionUi = { ...mockSolUserTransactionUi, to: undefined };

			const result = mapSolTransactionToUserTransaction(tx);

			expect(result.to).toEqual(toNullable());
		});

		it('should map fee as empty when undefined', () => {
			const { fee: _, ...rest } = mockSolUserTransactionUi;
			const tx: SolTransactionUi = { ...rest } as SolTransactionUi;

			const result = mapSolTransactionToUserTransaction(tx);

			expect(result.network_data).toEqual({
				Sol: {
					fee: toNullable(),
					from_owner: toNullable(mockSolUserTransactionUi.fromOwner),
					to_owner: toNullable(mockSolUserTransactionUi.toOwner)
				}
			});
		});

		it('should map fromOwner and toOwner as empty when undefined', () => {
			const { fromOwner: _, toOwner: __, ...rest } = mockSolUserTransactionUi;
			const tx: SolTransactionUi = { ...rest } as SolTransactionUi;

			const result = mapSolTransactionToUserTransaction(tx);

			expect(result.network_data).toEqual({
				Sol: {
					fee: toNullable(mockSolUserTransactionUi.fee),
					from_owner: toNullable(),
					to_owner: toNullable()
				}
			});
		});
	});

	describe('mapUserTransactionToSolTransaction', () => {
		it('should correctly map a UserTransaction to SolTransactionUi', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: mockSolAddress
			});

			expect(result).toEqual({
				id: mockSolBackendUserTransaction.id,
				signature: signature(mockSignature),
				blockNumber: Number(mockSolBackendUserTransaction.block_index),
				timestamp: BigInt(mockSolBackendUserTransaction.timestamp),
				from: mockSolAddress,
				to: mockSolUserTransactionUi.to,
				value: 5000n,
				type: 'send',
				status: 'finalized',
				fee: 5000n,
				fromOwner: 'owner1',
				toOwner: 'owner2'
			});
		});

		it('should throw when network_data is not Sol', () => {
			const transaction = {
				...mockSolBackendUserTransaction,
				network_data: { Evm: {} }
			} as unknown as UserTransaction;

			expect(() =>
				mapUserTransactionToSolTransaction({ transaction, address: mockSolAddress })
			).toThrow('Expected Sol network data for Solana transaction mapping');
		});

		it('should determine type as "send" when address matches from', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: mockSolAddress
			});

			expect(result.type).toBe('send');
		});

		it('should determine type as "receive" when address does not match from or fromOwner', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: 'some-other-address'
			});

			expect(result.type).toBe('receive');
		});

		it('should determine type as "send" when address matches fromOwner', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: 'owner1'
			});

			expect(result.type).toBe('send');
		});

		it('should map optional "to" as undefined when empty', () => {
			const transaction: UserTransaction = {
				...mockSolBackendUserTransaction,
				to: toNullable()
			};

			const result = mapUserTransactionToSolTransaction({
				transaction,
				address: mockSolAddress
			});

			expect(result.to).toBeUndefined();
		});

		it('should not include fee when it is empty', () => {
			const transaction: UserTransaction = {
				...mockSolBackendUserTransaction,
				network_data: {
					Sol: {
						fee: toNullable(),
						from_owner: toNullable('owner1'),
						to_owner: toNullable('owner2')
					}
				}
			};

			const result = mapUserTransactionToSolTransaction({
				transaction,
				address: mockSolAddress
			});

			expect(result.fee).toBeUndefined();
		});

		it('should not include fromOwner and toOwner when empty', () => {
			const transaction: UserTransaction = {
				...mockSolBackendUserTransaction,
				network_data: {
					Sol: {
						fee: toNullable(5000n),
						from_owner: toNullable(),
						to_owner: toNullable()
					}
				}
			};

			const result = mapUserTransactionToSolTransaction({
				transaction,
				address: mockSolAddress
			});

			expect(result.fromOwner).toBeUndefined();
			expect(result.toOwner).toBeUndefined();
		});

		it('should extract signature from id by splitting on "-"', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: mockSolAddress
			});

			expect(result.signature).toEqual(signature(mockSignature));
		});

		it('should always set status to "finalized"', () => {
			const result = mapUserTransactionToSolTransaction({
				transaction: mockSolBackendUserTransaction,
				address: mockSolAddress
			});

			expect(result.status).toBe('finalized');
		});
	});

	describe('round-trip mapping', () => {
		it('should preserve data through SolTransactionUi -> UserTransaction -> SolTransactionUi', () => {
			const userTransaction = mapSolTransactionToUserTransaction(mockSolUserTransactionUi);
			const result = mapUserTransactionToSolTransaction({
				transaction: userTransaction,
				address: mockSolAddress
			});

			expect(result.id).toBe(mockSolUserTransactionUi.id);
			expect(result.blockNumber).toBe(mockSolUserTransactionUi.blockNumber);
			expect(result.timestamp).toBe(mockSolUserTransactionUi.timestamp);
			expect(result.from).toBe(mockSolUserTransactionUi.from);
			expect(result.to).toBe(mockSolUserTransactionUi.to);
			expect(result.value).toBe(mockSolUserTransactionUi.value);
			expect(result.fee).toBe(mockSolUserTransactionUi.fee);
			expect(result.fromOwner).toBe(mockSolUserTransactionUi.fromOwner);
			expect(result.toOwner).toBe(mockSolUserTransactionUi.toOwner);
			expect(result.type).toBe('send');
			expect(result.status).toBe('finalized');
		});
	});

	describe('isSolTransactionFinalized', () => {
		it('should return true when status is "finalized"', () => {
			expect(
				isSolTransactionFinalized({ ...mockSolUserTransactionUi, status: 'finalized' })
			).toBeTruthy();
		});

		it('should return false when status is "confirmed"', () => {
			expect(
				isSolTransactionFinalized({ ...mockSolUserTransactionUi, status: 'confirmed' })
			).toBeFalsy();
		});

		it('should return false when status is "processed"', () => {
			expect(
				isSolTransactionFinalized({ ...mockSolUserTransactionUi, status: 'processed' })
			).toBeFalsy();
		});

		it('should return false when status is null', () => {
			expect(isSolTransactionFinalized({ ...mockSolUserTransactionUi, status: null })).toBeFalsy();
		});
	});

	describe('requiresStoredSplOwnerRefresh', () => {
		const mockTokenAddress = 'mock-token-address';
		const ownerlessSplTransaction: SolTransactionUi = {
			...mockSolUserTransactionUi,
			from: 'mock-source-token-account',
			to: 'mock-destination-token-account',
			fromOwner: undefined,
			toOwner: undefined
		};

		it('should request a refresh for SPL transactions without wallet address or owner context', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: ownerlessSplTransaction,
					address: mockSolAddress,
					tokenAddress: mockTokenAddress
				})
			).toBeTruthy();
		});

		it('should not request a refresh for native SOL transactions', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: ownerlessSplTransaction,
					address: mockSolAddress
				})
			).toBeFalsy();
		});

		it('should not request a refresh when the wallet address matches the source address', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: { ...ownerlessSplTransaction, from: mockSolAddress },
					address: mockSolAddress,
					tokenAddress: mockTokenAddress
				})
			).toBeFalsy();
		});

		it('should not request a refresh when the wallet address matches the source owner', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: { ...ownerlessSplTransaction, fromOwner: mockSolAddress },
					address: mockSolAddress,
					tokenAddress: mockTokenAddress
				})
			).toBeFalsy();
		});

		it('should not request a refresh when the wallet address matches the destination address', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: { ...ownerlessSplTransaction, to: mockSolAddress },
					address: mockSolAddress,
					tokenAddress: mockTokenAddress
				})
			).toBeFalsy();
		});

		it('should not request a refresh when the wallet address matches the destination owner', () => {
			expect(
				requiresStoredSplOwnerRefresh({
					transaction: {
						...ownerlessSplTransaction,
						to: mockSolAddress2,
						toOwner: mockSolAddress
					},
					address: mockSolAddress,
					tokenAddress: mockTokenAddress
				})
			).toBeFalsy();
		});
	});

	describe('solBackendTokenId', () => {
		it('should return SolNativeMainnet for mainnet without tokenAddress', () => {
			expect(solBackendTokenId({ network: 'mainnet' })).toEqual({ SolNativeMainnet: null });
		});

		it('should return SolNativeDevnet for devnet without tokenAddress', () => {
			expect(solBackendTokenId({ network: 'devnet' })).toEqual({ SolNativeDevnet: null });
		});

		it('should return SplMainnet for mainnet with tokenAddress', () => {
			expect(solBackendTokenId({ network: 'mainnet', tokenAddress: 'mock-token-address' })).toEqual(
				{ SplMainnet: 'mock-token-address' }
			);
		});

		it('should return SplDevnet for devnet with tokenAddress', () => {
			expect(solBackendTokenId({ network: 'devnet', tokenAddress: 'mock-token-address' })).toEqual({
				SplDevnet: 'mock-token-address'
			});
		});
	});
});
