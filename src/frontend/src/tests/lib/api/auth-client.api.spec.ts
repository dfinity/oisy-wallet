import {
	authClientStorage,
	createAuthClient,
	loadIdentity,
	safeCreateAuthClient
} from '$lib/api/auth-client.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { AuthClient, KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from '@dfinity/auth-client';
import { mock } from 'vitest-mock-extended';

describe('auth-client.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(AuthClient, 'create');

		vi.spyOn(authClientStorage, 'get');
		vi.spyOn(authClientStorage, 'set');
		vi.spyOn(authClientStorage, 'remove');
	});

	describe('createAuthClient', () => {
		it('should create an auth client', async () => {
			const result = await createAuthClient();

			expect(result).toBeInstanceOf(AuthClient);

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});

			expect(authClientStorage.get).toHaveBeenCalledExactlyOnceWith(KEY_STORAGE_KEY);

			expect(authClientStorage.set).toHaveBeenCalledExactlyOnceWith(
				KEY_STORAGE_KEY,
				expect.any(Object)
			);

			expect(authClientStorage.remove).not.toHaveBeenCalled();
		});

		it('should not create a new key when called a second time', async () => {
			const result = await createAuthClient();

			expect(result).toBeInstanceOf(AuthClient);

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});

			expect(authClientStorage.get).toHaveBeenCalledTimes(2);
			expect(authClientStorage.get).toHaveBeenNthCalledWith(1, KEY_STORAGE_KEY);
			expect(authClientStorage.get).toHaveBeenNthCalledWith(2, KEY_STORAGE_DELEGATION);

			expect(authClientStorage.set).not.toHaveBeenCalled();

			expect(authClientStorage.remove).not.toHaveBeenCalled();
		});
	});

	describe('safeCreateAuthClient', () => {
		it('should create an auth client', async () => {
			const result = await safeCreateAuthClient();

			expect(result).toBeInstanceOf(AuthClient);

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});

			expect(authClientStorage.get).toHaveBeenCalledExactlyOnceWith(KEY_STORAGE_KEY);

			expect(authClientStorage.set).toHaveBeenCalledExactlyOnceWith(
				KEY_STORAGE_KEY,
				expect.any(Object)
			);

			expect(authClientStorage.remove).toHaveBeenCalledExactlyOnceWith(KEY_STORAGE_KEY);
		});

		it('should create a new key when called a second time', async () => {
			const result = await safeCreateAuthClient();

			expect(result).toBeInstanceOf(AuthClient);

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});

			expect(authClientStorage.get).toHaveBeenCalledExactlyOnceWith(KEY_STORAGE_KEY);

			expect(authClientStorage.set).toHaveBeenCalledExactlyOnceWith(
				KEY_STORAGE_KEY,
				expect.any(Object)
			);

			expect(authClientStorage.remove).toHaveBeenCalledExactlyOnceWith(KEY_STORAGE_KEY);
		});
	});

	describe('loadIdentity', () => {
		const authClientMock = mock<AuthClient>();

		const mockIsAuthenticated = vi.fn();
		const mockGetIdentity = vi.fn();

		beforeEach(() => {
			mockIsAuthenticated.mockResolvedValue(false);
			mockGetIdentity.mockResolvedValue(mockIdentity);

			authClientMock.isAuthenticated.mockImplementation(mockIsAuthenticated);
			authClientMock.getIdentity.mockImplementation(mockGetIdentity);

			vi.spyOn(AuthClient, 'create').mockResolvedValue(authClientMock);
		});

		it('should create an auth client', async () => {
			await loadIdentity();

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});
		});

		it('should not create a new key when called a second time', async () => {
			await loadIdentity();

			expect(AuthClient.create).toHaveBeenCalledExactlyOnceWith({
				storage: authClientStorage,
				idleOptions: {
					disableIdle: true,
					disableDefaultIdleCallback: true
				}
			});

			expect(authClientStorage.set).not.toHaveBeenCalled();

			expect(authClientStorage.remove).not.toHaveBeenCalled();
		});

		it('should return undefined if not authenticated', async () => {
			mockIsAuthenticated.mockResolvedValue(false);

			const result = await loadIdentity();

			expect(result).toBeUndefined();
		});

		it('should return identity if authenticated', async () => {
			mockIsAuthenticated.mockResolvedValue(true);

			const result = await loadIdentity();

			expect(result).toBe(mockIdentity);
		});
	});
});
