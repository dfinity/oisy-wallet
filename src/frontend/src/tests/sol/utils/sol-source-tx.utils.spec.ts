import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';
import { toSolSourceTxOutcome } from '$sol/utils/sol-source-tx.utils';

describe('sol-source-tx.utils', () => {
	const statusAt = ({
		confirmationStatus,
		err = null
	}: {
		confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
		err?: unknown;
	}): SolanaSignatureStatus =>
		({
			confirmationStatus,
			confirmations: null,
			err,
			slot: 100n,
			status: { Ok: null }
		}) as SolanaSignatureStatus;

	const instructionError = { InstructionError: [3, { Custom: 6001 }] };

	describe('toSolSourceTxOutcome', () => {
		it.each(['confirmed', 'finalized'] as const)(
			'should succeed a transaction %s without an error',
			(confirmationStatus) => {
				expect(toSolSourceTxOutcome({ status: statusAt({ confirmationStatus }) })).toBe(
					'succeeded'
				);
			}
		);

		it.each(['confirmed', 'finalized'] as const)(
			'should revert a transaction %s with an error',
			(confirmationStatus) => {
				expect(
					toSolSourceTxOutcome({
						status: statusAt({ confirmationStatus, err: instructionError })
					})
				).toBe('reverted');
			}
		);

		it.each(['processed', null] as const)(
			'should keep a transaction %s pending, whatever its error, since its block may still be dropped',
			(confirmationStatus) => {
				expect(toSolSourceTxOutcome({ status: statusAt({ confirmationStatus }) })).toBe('pending');
				expect(
					toSolSourceTxOutcome({ status: statusAt({ confirmationStatus, err: instructionError }) })
				).toBe('pending');
			}
		);

		it('should keep a transaction without a status pending while its blockhash is valid', () => {
			expect(toSolSourceTxOutcome({ status: null, blockhashValid: true })).toBe('pending');
		});

		it('should expire a transaction without a status once its blockhash is invalid', () => {
			expect(toSolSourceTxOutcome({ status: null, blockhashValid: false })).toBe('expired');
		});

		it('should keep a transaction without a status pending while its blockhash was not read', () => {
			expect(toSolSourceTxOutcome({ status: null })).toBe('pending');
		});

		it('should go by the status, not the blockhash, when there is one', () => {
			expect(
				toSolSourceTxOutcome({
					status: statusAt({ confirmationStatus: 'confirmed' }),
					blockhashValid: false
				})
			).toBe('succeeded');
		});
	});
});
