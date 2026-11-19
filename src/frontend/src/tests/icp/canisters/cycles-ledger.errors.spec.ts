import type { WithdrawError } from '$declarations/cycles_ledger/cycles_ledger.did';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError,
	mapCyclesLedgerWithdrawError,
	type CyclesLedgerWithdrawRefusal
} from '$icp/canisters/cycles-ledger.errors';
import { mockPrincipal } from '$tests/mocks/identity.mock';

describe('cycles-ledger.errors', () => {
	describe('mapCyclesLedgerWithdrawError', () => {
		it('should map Duplicate to the block of the earlier withdrawal', () => {
			const err = mapCyclesLedgerWithdrawError({ Duplicate: { duplicate_of: 42n } });

			expect(err).toBeInstanceOf(CyclesLedgerWithdrawDuplicateError);
			expect((err as CyclesLedgerWithdrawDuplicateError).duplicateOf).toBe(42n);
		});

		it('should map FailedToWithdraw to a failed deposit carrying the refund block and reason', () => {
			const err = mapCyclesLedgerWithdrawError({
				FailedToWithdraw: {
					rejection_code: { DestinationInvalid: null },
					fee_block: [43n],
					rejection_reason: 'Canister not found'
				}
			});

			expect(err).toBeInstanceOf(CyclesLedgerWithdrawFailedError);
			expect((err as CyclesLedgerWithdrawFailedError).refundBlockIndex).toBe(43n);
			expect(err.message).toBe('Canister not found');
		});

		it('should map a FailedToWithdraw without a refund block', () => {
			const err = mapCyclesLedgerWithdrawError({
				FailedToWithdraw: {
					rejection_code: { DestinationInvalid: null },
					fee_block: [],
					rejection_reason: 'Canister not found'
				}
			});

			expect((err as CyclesLedgerWithdrawFailedError).refundBlockIndex).toBeUndefined();
		});

		it.each<{ withdrawError: WithdrawError; refusal: CyclesLedgerWithdrawRefusal }>([
			{ withdrawError: { InsufficientFunds: { balance: 1n } }, refusal: 'insufficient_funds' },
			{
				withdrawError: { InvalidReceiver: { receiver: mockPrincipal } },
				refusal: 'invalid_receiver'
			},
			{ withdrawError: { TooOld: null }, refusal: 'too_old' },
			{ withdrawError: { CreatedInFuture: { ledger_time: 1n } }, refusal: 'created_in_future' },
			{ withdrawError: { TemporarilyUnavailable: null }, refusal: 'temporarily_unavailable' },
			{ withdrawError: { BadFee: { expected_fee: 100_000_000n } }, refusal: 'bad_fee' },
			{
				withdrawError: { GenericError: { message: 'Something else', error_code: 1n } },
				refusal: 'generic'
			}
		])('should map the answer to the refusal $refusal', ({ withdrawError, refusal }) => {
			const err = mapCyclesLedgerWithdrawError(withdrawError);

			expect(err).toBeInstanceOf(CyclesLedgerWithdrawRefusedError);
			expect((err as CyclesLedgerWithdrawRefusedError).refusal).toBe(refusal);
		});

		it('should keep the message of a generic error', () => {
			const err = mapCyclesLedgerWithdrawError({
				GenericError: { message: 'Something else', error_code: 1n }
			});

			expect(err.message).toBe('Something else');
		});
	});
});
