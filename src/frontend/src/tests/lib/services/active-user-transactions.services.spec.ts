import * as backendApi from '$lib/api/backend.api';
import { activeUserTransactionsList } from '$lib/derived/active-user-transactions.derived';
import {
	applyActiveUserTransactionPollUpdate,
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	loadActiveUserTransactions,
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
	getActiveUserTransactions: vi.fn()
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
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue([
				mockActiveUserTransaction
			]);

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([mockActiveUserTransaction]);
		});

		it('should swallow API errors and leave the store empty', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await loadActiveUserTransactions({ identity: mockIdentity });

			expect(get(activeUserTransactionsList)).toEqual([]);
		});

		it('drops a late response when the store has been reset mid-flight', async () => {
			// Simulates: load(A) issues getActiveUserTransactions; before the
			// response lands, the user signs out and the store is reset. A's
			// late response must not resurrect data after the reset.
			let resolveLoad: (transactions: (typeof mockActiveUserTransaction)[]) => void = () => {};
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveLoad = resolve;
				})
			);

			const inFlight = loadActiveUserTransactions({ identity: mockIdentity });

			// Sign-out fires the reset path before A's response arrives.
			activeUserTransactionsStore.reset();

			resolveLoad([mockActiveUserTransaction]);
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
