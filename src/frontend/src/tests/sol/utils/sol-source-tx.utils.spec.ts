import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';
import { toSolSourceTxOutcome } from '$sol/utils/sol-source-tx.utils';
import type { TransactionError } from '@solana/kit';

describe('sol-source-tx.utils', () => {
	const statusAt = ({
		confirmationStatus,
		err = null
	}: {
		confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
		err?: TransactionError | null;
	}): SolanaSignatureStatus => ({
		confirmationStatus,
		confirmations: null,
		err,
		slot: 100n,
		status: { Ok: null }
	});

	const instructionError: TransactionError = { InstructionError: [3, { Custom: 6001 }] };

	describe('toSolSourceTxOutcome', () => {
		it.each(['confirmed', 'finalized'] as const)(
			'should succeed a transaction %s without an error',
			(confirmationStatus) => {
				expect(
					toSolSourceTxOutcome({ status: statusAt({ confirmationStatus }), statusSlot: 200n })
				).toBe('succeeded');
			}
		);

		it.each(['confirmed', 'finalized'] as const)(
			'should revert a transaction %s with an error',
			(confirmationStatus) => {
				expect(
					toSolSourceTxOutcome({
						status: statusAt({ confirmationStatus, err: instructionError }),
						statusSlot: 200n
					})
				).toBe('reverted');
			}
		);

		it.each(['processed', null] as const)(
			'should keep a transaction %s pending, whatever its error, since its block may still be dropped',
			(confirmationStatus) => {
				expect(
					toSolSourceTxOutcome({ status: statusAt({ confirmationStatus }), statusSlot: 200n })
				).toBe('pending');
				expect(
					toSolSourceTxOutcome({
						status: statusAt({ confirmationStatus, err: instructionError }),
						statusSlot: 200n
					})
				).toBe('pending');
			}
		);

		it('should keep a transaction without a status pending while its blockhash was not read', () => {
			expect(toSolSourceTxOutcome({ status: null, statusSlot: 200n })).toBe('pending');
		});

		it('should keep a transaction without a status pending while its blockhash is valid', () => {
			expect(
				toSolSourceTxOutcome({
					status: null,
					statusSlot: 200n,
					blockhash: { valid: true, slot: 200n }
				})
			).toBe('pending');
		});

		it.each([200n, 201n])(
			'should expire a transaction whose status was read at slot %s, at or past the expired blockhash',
			(statusSlot) => {
				expect(
					toSolSourceTxOutcome({
						status: null,
						statusSlot,
						blockhash: { valid: false, slot: 200n }
					})
				).toBe('expired');
			}
		);

		it('should keep a transaction pending when its status was read behind the expired blockhash', () => {
			expect(
				toSolSourceTxOutcome({
					status: null,
					statusSlot: 199n,
					blockhash: { valid: false, slot: 200n }
				})
			).toBe('pending');
		});

		it('should go by the status, not the blockhash, when there is one', () => {
			expect(
				toSolSourceTxOutcome({
					status: statusAt({ confirmationStatus: 'confirmed' }),
					statusSlot: 200n,
					blockhash: { valid: false, slot: 200n }
				})
			).toBe('succeeded');
		});
	});
});
