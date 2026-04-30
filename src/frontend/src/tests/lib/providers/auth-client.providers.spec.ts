import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { AuthClient, KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from '@icp-sdk/auth/client';
import type * as IcpSdkIdentity from '@icp-sdk/core/identity';
import { DelegationChain, isDelegationValid } from '@icp-sdk/core/identity';

vi.mock('@icp-sdk/core/identity', async () => {
	const actual = await vi.importActual<typeof IcpSdkIdentity>('@icp-sdk/core/identity');
	return {
		...actual,
		isDelegationValid: vi.fn(actual.isDelegationValid),
		DelegationChain: {
			...actual.DelegationChain,
			fromJSON: vi.fn(actual.DelegationChain.fromJSON)
		}
	};
});

describe('auth-client.providers', () => {
	const {
		storage: authClientStorage,
		createAuthClient,
		safeCreateAuthClient,
		createAuthClientForSignIn,
		loadIdentity
	} = AuthClientProvider.getInstance();

	beforeEach(() => {
		vi.clearAllMocks();

		AuthClientProvider.getInstance().reset();

		vi.spyOn(authClientStorage, 'get');
		vi.spyOn(authClientStorage, 'set');
		vi.spyOn(authClientStorage, 'remove');
	});

	describe('createAuthClient', () => {
		it('should create an auth client', async () => {
			const result = await createAuthClient();

			expect(result).toBeInstanceOf(AuthClient);
		});

		it('should return the same cached instance on subsequent calls', async () => {
			const first = await createAuthClient();
			const second = await createAuthClient();

			expect(first).toBe(second);
		});

		it('should return a new instance when forceRecreate is true', async () => {
			const first = await createAuthClient();
			const second = await createAuthClient({ forceRecreate: true });

			expect(first).not.toBe(second);
			expect(second).toBeInstanceOf(AuthClient);
		});
	});

	describe('safeCreateAuthClient', () => {
		it('should create an auth client', async () => {
			const result = await safeCreateAuthClient();

			expect(result).toBeInstanceOf(AuthClient);
		});

		it('should clear stored key and delegation before creating a new client', async () => {
			await safeCreateAuthClient();

			expect(authClientStorage.remove).toHaveBeenCalledTimes(2);
			expect(authClientStorage.remove).toHaveBeenCalledWith(KEY_STORAGE_KEY);
			expect(authClientStorage.remove).toHaveBeenCalledWith(KEY_STORAGE_DELEGATION);
		});

		it('should force recreation of the cached client', async () => {
			const cached = await createAuthClient();
			const refreshed = await safeCreateAuthClient();

			expect(refreshed).not.toBe(cached);
		});
	});

	describe('createAuthClientForSignIn', () => {
		const identityProvider = 'https://id.ai/authorize';

		it('should create a fresh auth client', () => {
			const result = createAuthClientForSignIn({ identityProvider });

			expect(result).toBeInstanceOf(AuthClient);
		});

		it('should create a new instance on every call', () => {
			const first = createAuthClientForSignIn({ identityProvider });
			const second = createAuthClientForSignIn({ identityProvider });

			expect(first).not.toBe(second);
		});

		it('should replace the cached client so subsequent createAuthClient returns it', async () => {
			const signInClient = createAuthClientForSignIn({ identityProvider });
			const cached = await createAuthClient();

			expect(cached).toBe(signInClient);
		});
	});

	describe('loadIdentity', () => {
		const mockDelegationChainJson = 'mock-delegation-chain-json';
		const mockParsedChain = {} as DelegationChain;

		beforeEach(() => {
			vi.spyOn(AuthClient.prototype, 'getIdentity').mockResolvedValue(mockIdentity);

			vi.mocked(DelegationChain.fromJSON).mockReturnValue(mockParsedChain);
			vi.mocked(isDelegationValid).mockReturnValue(true);
		});

		it('should return undefined when no delegation is stored', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(null);

			const result = await loadIdentity();

			expect(result).toBeUndefined();
		});

		it('should return undefined when the stored delegation is not a string', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue({} as unknown as string);

			const result = await loadIdentity();

			expect(result).toBeUndefined();
		});

		it('should return undefined when the delegation is invalid', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(mockDelegationChainJson);
			vi.mocked(isDelegationValid).mockReturnValue(false);

			const result = await loadIdentity();

			expect(result).toBeUndefined();
		});

		it('should return undefined when parsing the delegation throws', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(mockDelegationChainJson);
			vi.mocked(DelegationChain.fromJSON).mockImplementation(() => {
				throw new Error('invalid json');
			});

			const result = await loadIdentity();

			expect(result).toBeUndefined();
		});

		it('should return the identity when the delegation is valid', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(mockDelegationChainJson);

			const result = await loadIdentity();

			expect(result).toBe(mockIdentity);
		});

		it('should not call getIdentity when the delegation is missing or invalid', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(null);
			const getIdentitySpy = vi
				.spyOn(AuthClient.prototype, 'getIdentity')
				.mockResolvedValue(mockIdentity);

			await loadIdentity();

			expect(getIdentitySpy).not.toHaveBeenCalled();
		});

		it('should not rely on AuthClient.isAuthenticated (not worker-safe in @icp-sdk/auth v6)', async () => {
			vi.mocked(authClientStorage.get).mockResolvedValue(mockDelegationChainJson);
			const isAuthenticatedSpy = vi.spyOn(AuthClient.prototype, 'isAuthenticated');

			await loadIdentity();

			expect(isAuthenticatedSpy).not.toHaveBeenCalled();
		});
	});
});
