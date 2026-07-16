import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	activeUserTransactionsStateToList,
	advanceStatus,
	hasActiveUserTransactionPollUpdateChanges,
	isActiveUserTransactionUnseen,
	isTerminalActiveUserTransaction,
	sortActiveUserTransactionsByCreatedAtDesc
} from '$lib/utils/active-user-transactions.utils';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';

const buildTx = (overrides: Partial<ActiveUserTransaction>): ActiveUserTransaction => ({
	...mockActiveUserTransaction,
	...overrides
});

describe('active-user-transactions.utils', () => {
	describe('isTerminalActiveUserTransaction', () => {
		it('is true for Succeeded and Failed statuses', () => {
			expect(
				isTerminalActiveUserTransaction(buildTx({ status: { Succeeded: null } }))
			).toBeTruthy();
			expect(isTerminalActiveUserTransaction(buildTx({ status: { Failed: null } }))).toBeTruthy();
		});

		it('is false for Pending and Executing statuses', () => {
			expect(isTerminalActiveUserTransaction(buildTx({ status: { Pending: null } }))).toBeFalsy();
			expect(isTerminalActiveUserTransaction(buildTx({ status: { Executing: null } }))).toBeFalsy();
		});
	});

	describe('sortActiveUserTransactionsByCreatedAtDesc', () => {
		it('returns transactions newest-first by created_at_ns', () => {
			const a = buildTx({ id: 'a', created_at_ns: 1n });
			const b = buildTx({ id: 'b', created_at_ns: 3n });
			const c = buildTx({ id: 'c', created_at_ns: 2n });

			expect(sortActiveUserTransactionsByCreatedAtDesc([a, b, c]).map((t) => t.id)).toEqual([
				'b',
				'c',
				'a'
			]);
		});

		it('does not mutate the input array', () => {
			const a = buildTx({ id: 'a', created_at_ns: 1n });
			const b = buildTx({ id: 'b', created_at_ns: 2n });
			const input = [a, b];

			sortActiveUserTransactionsByCreatedAtDesc(input);

			expect(input.map((t) => t.id)).toEqual(['a', 'b']);
		});
	});

	describe('activeUserTransactionsStateToList', () => {
		it('returns an empty array when state is undefined', () => {
			expect(activeUserTransactionsStateToList(undefined)).toEqual([]);
		});

		it('returns rows from the data map sorted newest-first', () => {
			const result = activeUserTransactionsStateToList({
				data: {
					old: buildTx({ id: 'old', created_at_ns: 1n }),
					new: buildTx({ id: 'new', created_at_ns: 9n })
				},
				lastSeenUpdatedAtNs: {},
				terminalSideEffectsApplied: {}
			});

			expect(result.map((t) => t.id)).toEqual(['new', 'old']);
		});
	});

	describe('isActiveUserTransactionUnseen', () => {
		const tx = buildTx({ id: 'a', updated_at_ns: 5n });

		it('returns false when state is undefined', () => {
			expect(isActiveUserTransactionUnseen({ state: undefined, tx })).toBeFalsy();
		});

		it('returns true when no seen-state is recorded for the id', () => {
			expect(
				isActiveUserTransactionUnseen({
					state: {
						data: { a: tx },
						lastSeenUpdatedAtNs: {},
						terminalSideEffectsApplied: {}
					},
					tx
				})
			).toBeTruthy();
		});

		it('returns true when seen-state is older than updated_at_ns', () => {
			expect(
				isActiveUserTransactionUnseen({
					state: {
						data: { a: tx },
						lastSeenUpdatedAtNs: { a: '3' },
						terminalSideEffectsApplied: {}
					},
					tx
				})
			).toBeTruthy();
		});

		it('returns false when seen-state matches updated_at_ns', () => {
			expect(
				isActiveUserTransactionUnseen({
					state: {
						data: { a: tx },
						lastSeenUpdatedAtNs: { a: '5' },
						terminalSideEffectsApplied: {}
					},
					tx
				})
			).toBeFalsy();
		});
	});

	describe('advanceStatus', () => {
		it('returns the candidate when it strictly advances', () => {
			expect(advanceStatus({ current: { Pending: null }, candidate: { Executing: null } })).toEqual(
				{ Executing: null }
			);
			expect(
				advanceStatus({ current: { Executing: null }, candidate: { Succeeded: null } })
			).toEqual({ Succeeded: null });
		});

		it('returns undefined for same-rank or backwards transitions', () => {
			expect(
				advanceStatus({ current: { Executing: null }, candidate: { Executing: null } })
			).toBeUndefined();
			expect(
				advanceStatus({ current: { Succeeded: null }, candidate: { Executing: null } })
			).toBeUndefined();
			expect(
				advanceStatus({ current: { Succeeded: null }, candidate: { Failed: null } })
			).toBeUndefined();
		});
	});

	describe('hasActiveUserTransactionPollUpdateChanges', () => {
		it('is true when at least one field is set', () => {
			expect(
				hasActiveUserTransactionPollUpdateChanges({ status: { Succeeded: null } })
			).toBeTruthy();
			expect(hasActiveUserTransactionPollUpdateChanges({ progressStep: 'x' })).toBeTruthy();
			expect(hasActiveUserTransactionPollUpdateChanges({ externalRefs: [] })).toBeTruthy();
			expect(hasActiveUserTransactionPollUpdateChanges({ error: 'oops' })).toBeTruthy();
		});

		it('is false on an empty update', () => {
			expect(hasActiveUserTransactionPollUpdateChanges({})).toBeFalsy();
		});
	});
});
