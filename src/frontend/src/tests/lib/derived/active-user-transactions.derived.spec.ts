import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	activeUserTransactionsFailed,
	activeUserTransactionsHasUnseen,
	activeUserTransactionsList,
	activeUserTransactionsPending,
	activeUserTransactionsSucceeded
} from '$lib/derived/active-user-transactions.derived';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const buildTx = (overrides: Partial<ActiveUserTransaction>): ActiveUserTransaction => ({
	...mockActiveUserTransaction,
	...overrides
});

const pending = ({ id, updatedAtNs }: { id: string; updatedAtNs: bigint }): ActiveUserTransaction =>
	buildTx({ id, status: { Pending: null }, updated_at_ns: updatedAtNs });

const succeeded = ({
	id,
	updatedAtNs
}: {
	id: string;
	updatedAtNs: bigint;
}): ActiveUserTransaction =>
	buildTx({ id, status: { Succeeded: null }, updated_at_ns: updatedAtNs });

describe('active-user-transactions.derived', () => {
	beforeEach(() => {
		activeUserTransactionsStore.reset();
		localStorage.clear();
	});

	describe('activeUserTransactionsList', () => {
		it('returns an empty list before init', () => {
			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('orders newest-first by created_at_ns', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: buildTx({ id: 'old', created_at_ns: 1n, updated_at_ns: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: buildTx({ id: 'new', created_at_ns: 9n, updated_at_ns: 9n })
			});

			expect(get(activeUserTransactionsList).map((t) => t.id)).toEqual(['new', 'old']);
		});
	});

	describe('activeUserTransactionsPending', () => {
		it('returns an empty list before init', () => {
			expect(get(activeUserTransactionsPending)).toEqual([]);
		});

		it('excludes terminal statuses', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'p', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: succeeded({ id: 's', updatedAtNs: 1n })
			});

			expect(get(activeUserTransactionsPending).map((t) => t.id)).toEqual(['p']);
		});
	});

	describe('activeUserTransactionsFailed', () => {
		it('returns an empty list before init', () => {
			expect(get(activeUserTransactionsFailed)).toEqual([]);
		});

		it('includes only failed statuses', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'p', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: succeeded({ id: 's', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: {
					...pending({ id: 'f', updatedAtNs: 1n }),
					status: { Failed: null }
				}
			});

			expect(get(activeUserTransactionsFailed).map((t) => t.id)).toEqual(['f']);
		});
	});

	describe('activeUserTransactionsSucceeded', () => {
		it('returns an empty list before init', () => {
			expect(get(activeUserTransactionsSucceeded)).toEqual([]);
		});

		it('includes only succeeded statuses', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'p', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: succeeded({ id: 's', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.upsert({
				transaction: {
					...pending({ id: 'f', updatedAtNs: 1n }),
					status: { Failed: null }
				}
			});

			expect(get(activeUserTransactionsSucceeded).map((t) => t.id)).toEqual(['s']);
		});
	});

	describe('activeUserTransactionsHasUnseen', () => {
		it('is false before init', () => {
			expect(get(activeUserTransactionsHasUnseen)).toBeFalsy();
		});

		it('is true while any row has no seen-state', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'a', updatedAtNs: 1n })
			});

			expect(get(activeUserTransactionsHasUnseen)).toBeTruthy();
		});

		it('flips to false on markAllSeen, then back to true when a newer update lands', () => {
			activeUserTransactionsStore.init(mockPrincipal);
			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'a', updatedAtNs: 1n })
			});
			activeUserTransactionsStore.markAllSeen();

			expect(get(activeUserTransactionsHasUnseen)).toBeFalsy();

			activeUserTransactionsStore.upsert({
				transaction: pending({ id: 'a', updatedAtNs: 2n })
			});

			expect(get(activeUserTransactionsHasUnseen)).toBeTruthy();
		});
	});
});
