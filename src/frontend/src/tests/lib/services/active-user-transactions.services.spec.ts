import * as backendApi from '$lib/api/backend.api';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	loadActiveUserTransactions,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	mockActiveUserTransaction,
	mockActiveUserTransactionErrorNotFound,
	mockActiveUserTransactionId,
	mockCreateActiveUserTransactionParams,
	mockUpdateActiveUserTransactionParams
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/backend.api', () => ({
	createActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn(),
	getActiveUserTransactions: vi.fn()
}));

describe('active-user-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadActiveUserTransactions', () => {
		it('should return undefined when identity is nullish', async () => {
			const result = await loadActiveUserTransactions({ identity: null });

			expect(result).toBeUndefined();
			expect(backendApi.getActiveUserTransactions).not.toHaveBeenCalled();
		});

		it('should return the transactions on success', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockResolvedValue([
				mockActiveUserTransaction
			]);

			const result = await loadActiveUserTransactions({ identity: mockIdentity });

			expect(backendApi.getActiveUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
			expect(result).toEqual([mockActiveUserTransaction]);
		});

		it('should swallow API errors and return undefined', async () => {
			vi.spyOn(backendApi, 'getActiveUserTransactions').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			const result = await loadActiveUserTransactions({ identity: mockIdentity });

			expect(result).toBeUndefined();
		});
	});

	describe('createActiveUserTransaction', () => {
		it('should forward params to the API and return the new transaction', async () => {
			vi.spyOn(backendApi, 'createActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			const result = await createActiveUserTransaction({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});

			expect(backendApi.createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockCreateActiveUserTransactionParams
			});
			expect(result).toEqual(mockActiveUserTransaction);
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
		});
	});

	describe('updateActiveUserTransaction', () => {
		it('should forward params to the API and return the updated transaction', async () => {
			vi.spyOn(backendApi, 'updateActiveUserTransaction').mockResolvedValue(
				mockActiveUserTransaction
			);

			const result = await updateActiveUserTransaction({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});

			expect(backendApi.updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				...mockUpdateActiveUserTransactionParams
			});
			expect(result).toEqual(mockActiveUserTransaction);
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
		it('should forward the id to the API and resolve to void', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockResolvedValue(undefined);

			const result = await deleteActiveUserTransaction({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});

			expect(backendApi.deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: mockActiveUserTransactionId
			});
			expect(result).toBeUndefined();
		});

		it('should propagate API errors so callers can surface them', async () => {
			vi.spyOn(backendApi, 'deleteActiveUserTransaction').mockRejectedValue(
				mockActiveUserTransactionErrorNotFound
			);

			await expect(
				deleteActiveUserTransaction({
					identity: mockIdentity,
					id: mockActiveUserTransactionId
				})
			).rejects.toEqual(mockActiveUserTransactionErrorNotFound);
		});
	});
});
