import { deleteIdbAllOisyRelated, deleteIdbDatabase } from '$lib/api/idb.api';

describe('idb.api', () => {
	describe('deleteIdbAllOisyRelated', () => {
		const originalIndexedDB = globalThis.indexedDB;

		const mockDatabases = vi.fn();
		const mockDeleteDatabase = vi.fn();

		const indexedDBMock = {
			databases: mockDatabases,
			deleteDatabase: mockDeleteDatabase
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.stubGlobal('indexedDB', indexedDBMock);
		});

		afterEach(() => {
			globalThis.indexedDB = originalIndexedDB;

			vi.unstubAllGlobals();
		});

		it('should not fail if the browser does not support indexedDB.databases()', async () => {
			vi.stubGlobal('indexedDB', {});

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			const indexedDBMock = {
				databases: vi.fn(() => {
					throw new Error('Not supported');
				})
			};

			vi.stubGlobal('indexedDB', indexedDBMock);

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(indexedDBMock.databases).toHaveBeenCalledExactlyOnceWith();
		});

		it('should handle an empty list of databases', async () => {
			mockDatabases.mockResolvedValueOnce([]);

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).not.toHaveBeenCalled();
		});

		it('should handle missing names in the database info', async () => {
			mockDatabases.mockResolvedValueOnce([{ name: null }, { name: undefined }, { version: 123 }]);

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).not.toHaveBeenCalled();
		});

		it('should do nothing if there is no OISY-related database', async () => {
			mockDatabases.mockResolvedValueOnce([{ name: 'other-db-1' }, { name: 'test-db' }]);

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).not.toHaveBeenCalled();
		});

		it('should delete only OISY-related databases', async () => {
			mockDatabases.mockResolvedValueOnce([
				{ name: 'oisy-btc-transactions' },
				{ name: 'other-db' },
				{ name: 'oisy-balances' }
			]);

			mockDeleteDatabase.mockImplementation(() => ({
				// eslint-disable-next-line local-rules/prefer-object-params
				addEventListener: (event: string, callback: () => void) => {
					if (event === 'success') {
						callback();
					}
				}
			}));

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).toHaveBeenCalledTimes(2);
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(1, 'oisy-btc-transactions');
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(2, 'oisy-balances');
		});

		it('should handle gracefully a failure during a database deletion', async () => {
			mockDatabases.mockResolvedValueOnce([
				{ name: 'oisy-btc-transactions' },
				{ name: 'oisy-balances' }
			]);

			mockDeleteDatabase
				.mockImplementationOnce(() => ({
					// eslint-disable-next-line local-rules/prefer-object-params
					addEventListener: (event: string, callback: () => void) => {
						if (event === 'error') {
							callback();
						}
					}
				}))
				.mockImplementationOnce(() => ({
					// eslint-disable-next-line local-rules/prefer-object-params
					addEventListener: (event: string, callback: () => void) => {
						if (event === 'success') {
							callback();
						}
					}
				}));

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).toHaveBeenCalledTimes(2);
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(1, 'oisy-btc-transactions');
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(2, 'oisy-balances');
		});

		it('should handle gracefully a blocked database deletion', async () => {
			mockDatabases.mockResolvedValueOnce([
				{ name: 'oisy-btc-transactions' },
				{ name: 'oisy-balances' }
			]);

			mockDeleteDatabase
				.mockImplementationOnce(() => ({
					// eslint-disable-next-line local-rules/prefer-object-params
					addEventListener: (event: string, callback: () => void) => {
						if (event === 'blocked') {
							callback();
						}
					}
				}))
				.mockImplementationOnce(() => ({
					// eslint-disable-next-line local-rules/prefer-object-params
					addEventListener: (event: string, callback: () => void) => {
						if (event === 'success') {
							callback();
						}
					}
				}));

			await expect(deleteIdbAllOisyRelated()).resolves.not.toThrow();

			expect(mockDatabases).toHaveBeenCalledExactlyOnceWith();

			expect(mockDeleteDatabase).toHaveBeenCalledTimes(2);
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(1, 'oisy-btc-transactions');
			expect(mockDeleteDatabase).toHaveBeenNthCalledWith(2, 'oisy-balances');
		});
	});

	describe('deleteIdbDatabase', () => {
		const mockDeleteDatabase = vi.fn();

		const mockRequestFiring = ({ event, error }: { event: string; error?: Error }) => ({
			error,
			// eslint-disable-next-line local-rules/prefer-object-params
			addEventListener: (type: string, callback: () => void) => {
				if (type === event) {
					callback();
				}
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();

			vi.stubGlobal('indexedDB', { deleteDatabase: mockDeleteDatabase });
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should resolve once the database is deleted', async () => {
			mockDeleteDatabase.mockReturnValueOnce(mockRequestFiring({ event: 'success' }));

			await expect(deleteIdbDatabase('some-database')).resolves.toBeUndefined();

			expect(mockDeleteDatabase).toHaveBeenCalledExactlyOnceWith('some-database');
		});

		it('should reject with the error of a failed deletion', async () => {
			const error = new Error('Deletion failed');

			mockDeleteDatabase.mockReturnValueOnce(mockRequestFiring({ event: 'error', error }));

			await expect(deleteIdbDatabase('some-database')).rejects.toThrow(error);
		});

		it('should reject when an open connection blocks the deletion', async () => {
			mockDeleteDatabase.mockReturnValueOnce(mockRequestFiring({ event: 'blocked' }));

			await expect(deleteIdbDatabase('some-database')).rejects.toThrow(
				'IndexedDB database deletion blocked: some-database'
			);
		});
	});
});
