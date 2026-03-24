import * as constants from '$lib/constants/app.constants';
import { authStore } from '$lib/stores/auth.store';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';

const { mockResetActors, mockAuthClient } = vi.hoisted(() => ({
	mockResetActors: vi.fn(),
	mockAuthClient: {
		isAuthenticated: vi.fn(),
		getIdentity: vi.fn(),
		login: vi.fn(),
		logout: vi.fn()
	}
}));

vi.mock('$lib/api/actors.reset', () => ({
	resetActors: mockResetActors
}));

vi.mock('$lib/providers/auth-client.providers', () => ({
	AuthClientProvider: {
		getInstance: () => ({
			createAuthClient: vi.fn().mockResolvedValue(mockAuthClient),
			safeCreateAuthClient: vi.fn().mockResolvedValue(mockAuthClient)
		})
	}
}));

vi.mock('$lib/providers/auth-broadcast.providers', () => ({
	AuthBroadcastChannel: {
		getInstance: () => ({
			postLoginSuccess: vi.fn()
		})
	}
}));

describe('auth.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthClient.isAuthenticated.mockResolvedValue(false);
	});

	describe('setForTesting', () => {
		const identity = Ed25519KeyIdentity.generate();

		it('should set the identity for testing', () => {
			expect(() => authStore.setForTesting(identity)).not.toThrow();

			const storeIdentity = get(authStore).identity;

			expect(storeIdentity).toBe(identity);
		});

		it('should throw an error if not TEST environment', () => {
			const spy = vi.spyOn(constants, 'TEST', 'get').mockReturnValue(false);

			expect(() => authStore.setForTesting(identity)).toThrow(
				'This function should only be used in npm run test environment'
			);

			spy.mockRestore();
		});
	});

	describe('resetActors integration', () => {
		const identity = Ed25519KeyIdentity.generate();

		it('should call resetActors on sync', async () => {
			mockAuthClient.isAuthenticated.mockResolvedValue(true);
			mockAuthClient.getIdentity.mockReturnValue(identity);

			await authStore.sync();

			expect(mockResetActors).toHaveBeenCalledOnce();
		});

		it('should call resetActors on forceSync', async () => {
			mockAuthClient.isAuthenticated.mockResolvedValue(true);
			mockAuthClient.getIdentity.mockReturnValue(identity);

			await authStore.forceSync();

			expect(mockResetActors).toHaveBeenCalledOnce();
		});

		it('should call resetActors on signIn success', async () => {
			mockAuthClient.isAuthenticated.mockResolvedValue(true);
			mockAuthClient.getIdentity.mockReturnValue(identity);
			mockAuthClient.login.mockImplementation(async ({ onSuccess }: { onSuccess: () => void }) => {
				onSuccess();
			});

			await authStore.sync();
			mockResetActors.mockClear();

			await authStore.signIn({});

			expect(mockResetActors).toHaveBeenCalledOnce();
		});

		it('should call resetActors on signOut', async () => {
			mockAuthClient.isAuthenticated.mockResolvedValue(true);
			mockAuthClient.getIdentity.mockReturnValue(identity);
			mockAuthClient.logout.mockResolvedValue(undefined);

			await authStore.sync();
			mockResetActors.mockClear();

			await authStore.signOut();

			expect(mockResetActors).toHaveBeenCalledOnce();
		});

		it('should call resetActors even when user is not authenticated', async () => {
			mockAuthClient.isAuthenticated.mockResolvedValue(false);

			await authStore.sync();

			expect(mockResetActors).toHaveBeenCalledOnce();
		});
	});
});
