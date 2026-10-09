import type { GetActiveUserTransactionsResponse } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { activeUserTransactionsList } from '$lib/derived/active-user-transactions.derived';
import {
	applyActiveUserTransactionPollUpdate,
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	loadActiveUserTransactions,
	markActiveUserTransactionsSeen,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import {
	mockActiveUserTransaction,
	mockActiveUserTransactionErrorNotFound,
	mockActiveUserTransactionId,
	mockCreateActiveUserTransactionParams,
	mockUpdateActiveUserTransactionParams
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	createActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn(),
	getActiveUserTransactions: vi.fn(),
	markActiveUserTransactionsSeen: vi.fn()
}));

describe('active-user-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		activeUserTransactionsStore.reset();
		localStorage.clear();
	});

	describe('loadActiveUserTransactions', () => {
		it('should reset the store and skip the API call when identity is nullish', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({
				transaction: mockActiveUserTransaction
			});

			await loadActiveUserTransactions({ identity: null });

			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();
			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});

		it('should init the store and prime it on success', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [mockActiveUserTransaction],
				seen_up_to_ns: ZERO
			});

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		it('should keep the seen mark the backend returns', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue({
				transactions: [mockActiveUserTransaction],
				seen_up_to_ns: mockActiveUserTransaction.updated_at_ns
			});

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(
				mockActiveUserTransaction.updated_at_ns
			);
		});

		it('should swallow API errors and leave the store empty', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		// The race the merge exists for: a record created while the load's read is in flight is in the
		// store before the older snapshot lands, and must still be there afterwards — for an XRP send
		// the record is the only thing that ever reports the payment's outcome.
		it('keeps a record created while the load is in flight', async () => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());

			let resolveLoad: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValueOnce(
				mockActiveUserTransaction
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			// The snapshot was read before the create committed, so it does not have the row.
			resolveLoad({ transactions: [], seen_up_to_ns: ZERO });
			await inFlight;

			expect(get(activeUserTransactionsStore)?.data[mockActiveUserTransaction.id]).toEqual(
				mockActiveUserTransaction
			);
		});

		it('drops a late response when the store has been reset mid-flight', async () => {
			// Simulates: load(A) issues getActiveUserTransactions; before the
			// response lands, the user signs out and the store is reset. A's
			// late response must not resurrect data after the reset.
			let resolveLoad: (response: GetActiveUserTransactionsResponse) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			// Sign-out fires the reset path before A's response arrives.
			activeUserTransactionsStore.reset();

			resolveLoad({ transactions: [mockActiveUserTransaction], seen_up_to_ns: ZERO });
			await inFlight;

			expect(get(activeUserTransactionsStore)).toBeUndefined();
		});
	});

	describe('createActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('should forward params and upsert into the store on success', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			expect(backendApi.createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		it('should propagate API errors so callers can surface them', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				createActiveUserTransaction({
					identity: mockIdentity,
					...mockCreateActiveUserTransactionParams
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
			expect(get(activeUserTransactionsList)).toEqual([]);
		});
	});

	describe('updateActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('should forward params and upsert into the store on success', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await updateActiveUserTransaction({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});

			expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		it('should propagate API errors so callers can surface them', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				updateActiveUserTransaction({
					identity: mockIdentity,
					...mockUpdateActiveUserTransactionParams
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
		});
	});

	describe('deleteActiveUserTransaction', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({
				transaction: mockActiveUserTransaction
			});
		});

		it('should call the API and remove the row from the store on success', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockResolvedValue(undefined);

			await deleteActiveUserTransaction({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});

			expect(backendApi.deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});
			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('should leave the store untouched if the API rejects', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				deleteActiveUserTransaction({
					identity: mockIdentity,
					id: mockActiveUserTransactionId
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});
	});

	describe('markActiveUserTransactionsSeen', () => {
		const older = { ...mockActiveUserTransaction, id: 'older', updated_at_ns: 5n };
		const latest = { ...mockActiveUserTransaction, id: 'latest', updated_at_ns: 7n };

		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.set({ transactions: [older, latest] });
		});

		it('marks every row seen here, and up to the latest update for the other devices', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockResolvedValue(7n);

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(backendApi.markActiveUserTransactionsSeen).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				upToNs: 7n
			});
			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(7n);
		});

		// Another device marked further in the meantime.
		it('keeps the later mark the backend answers with', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockResolvedValue(9n);

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(9n);
		});

		it('does not call the backend when nothing changed since its mark', async () => {
			activeUserTransactionsStore.setSeenUpTo({ seenUpToNs: 7n });

			await markActiveUserTransactionsSeen({ identity: mockIdentity });

			expect(backendApi.markActiveUserTransactionsSeen).not.toHaveBeenCalled();
		});

		it('marks the rows seen here without an identity', async () => {
			await markActiveUserTransactionsSeen({ identity: null });

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(backendApi.markActiveUserTransactionsSeen).not.toHaveBeenCalled();
		});

		it('keeps the mark made here when the backend call fails', async () => {
			vi.spyOn(backendApi, 'markActiveUserTransactionsSeen').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				markActiveUserTransactionsSeen({ identity: mockIdentity })
			).resolves.toBeUndefined();

			expect(get(activeUserTransactionsStore)?.lastSeenUpdatedAtNs).toEqual({
				older: '5',
				latest: '7'
			});
			expect(get(activeUserTransactionsStore)?.seenUpToNs).toBe(ZERO);
		});
	});

	describe('applyActiveUserTransactionPollUpdate', () => {
		beforeEach(() => {
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		});

		it('does nothing when update is undefined', async () => {
			await applyActiveUserTransactionPollUpdate({
				identity: mockIdentity,
				tx: mockActiveUserTransaction,
				update: undefined
			});

			expect(backendApi.updateActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('skips no-op updates', async () => {
			await applyActiveUserTransactionPollUpdate({
				identity: mockIdentity,
				tx: mockActiveUserTransaction,
				update: {}
			});

			expect(backendApi.updateActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('forwards the update when something changes', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			await applyActiveUserTransactionPollUpdate({
				identity: mockIdentity,
				tx: mockActiveUserTransaction,
				update: { status: { Succeeded: null }, progressStep: 'done' }
			});

			expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: mockActiveUserTransaction.id,
				status: { Succeeded: null },
				progressStep: 'done'
			});
		});

		it('swallows backend errors so the next tick can retry', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockRejectedValue(new Error('boom'));

			await expect(
				applyActiveUserTransactionPollUpdate({
					identity: mockIdentity,
					tx: mockActiveUserTransaction,
					update: { status: { Succeeded: null } }
				})
			).resolves.toBeUndefined();
		});
	});
});
