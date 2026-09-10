import { ZERO } from '$lib/constants/app.constants';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import {
	isSolTransactionFinalized,
	mapSolTransactionToUserTransaction,
	solBackendTokenId
} from '$sol/utils/user-transactions.utils';
import { mockSolUserTransactionUi } from '$tests/mocks/sol-user-transactions.mock';
import { toNullable } from '@dfinity/utils';

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
