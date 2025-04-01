import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as api from '$lib/api/backend.api';
import { allowSigning } from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import { loadAddresses, loadIdbAddresses } from '$lib/services/addresses.services';
import * as authServices from '$lib/services/auth.services';
import { nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { initLoader, initSignerAllowance } from '$lib/services/loader.services';
import { authStore } from '$lib/stores/auth.store';
import { loading } from '$lib/stores/loader.store';
import type { LoadIdbAddressError } from '$lib/types/errors';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import { type MockInstance } from 'vitest';

vi.mock('$lib/services/load-user-profile.services', () => ({
	loadUserProfile: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('$lib/services/addresses.services', () => ({
	loadIdbAddresses: vi.fn(() => Promise.resolve({ success: true })),
	loadAddresses: vi.fn(() => Promise.resolve({ success: true }))
}));

describe('loader.services', () => {
	describe('initSignerAllowance', () => {
		let apiMock: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			apiMock = vi.spyOn(api, 'allowSigning');

			mockAuthStore();

			Object.defineProperty(window, 'location', {
				writable: true,
				value: {
					href: 'https://oisy.com',
					reload: vi.fn()
				}
			});

			vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
		});

		it('should return success', async () => {
			apiMock.mockResolvedValueOnce(undefined);

			const result = await initSignerAllowance();

			expect(result.success).toBeTruthy();
		});

		it('should return success equals to false', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			const result = await initSignerAllowance();

			expect(result.success).toBeFalsy();
		});

		it('should sign out and ultimately reload the window', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			const spySignOut = vi.spyOn(authServices, 'errorSignOut');

			const spy = vi.spyOn(window.location, 'reload');

			await initSignerAllowance();

			expect(spySignOut).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledOnce();
		});
	});

	describe('initLoader', () => {
		const mockValidateAddresses = vi.fn();
		const mockProgressAndLoad = vi.fn();
		const mockSetProgressModal = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			validateAddresses: mockValidateAddresses,
			progressAndLoad: mockProgressAndLoad,
			setProgressModal: mockSetProgressModal
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			vi.spyOn(authServices, 'signOut').mockImplementation(vi.fn());
			vi.spyOn(authServices, 'nullishSignOut').mockImplementation(vi.fn());
			vi.spyOn(api, 'allowSigning').mockImplementation(vi.fn());
		});

		it('should sign out if the identity is nullish', async () => {
			await initLoader({ ...mockParams, identity: null });

			expect(nullishSignOut).toHaveBeenCalledOnce();
		});

		it('should load the user profile', async () => {
			await initLoader(mockParams);

			expect(loadUserProfile).toHaveBeenCalledOnce();
			expect(loadUserProfile).toHaveBeenNthCalledWith(1, { identity: mockIdentity });
		});

		it('should sign out if the user profile is not loaded', async () => {
			vi.mocked(loadUserProfile).mockResolvedValueOnce({ success: false });

			await initLoader(mockParams);

			expect(signOut).toHaveBeenCalledOnce();
		});

		it('should load addresses from IDB', async () => {
			await initLoader(mockParams);

			expect(loadIdbAddresses).toHaveBeenCalledOnce();

			expect(mockProgressAndLoad).toHaveBeenCalledOnce();
			expect(mockValidateAddresses).toHaveBeenCalledOnce();

			expect(get(loading)).toBeFalsy();
		});

		it('should not load addresses from the backend if the IDB addresses are loaded', async () => {
			await initLoader(mockParams);

			expect(allowSigning).not.toHaveBeenCalled();
			expect(loadAddresses).not.toHaveBeenCalledOnce();
		});

		it('should load addresses from the backend if the IDB addresses are not loaded', async () => {
			mockAuthStore(mockIdentity);
			authStore.setForTesting(mockIdentity);

			vi.mocked(loadIdbAddresses).mockResolvedValueOnce({
				success: false,
				err: [{ tokenId: ICP_TOKEN_ID }, { tokenId: SOLANA_TOKEN_ID }] as LoadIdbAddressError[]
			});

			await initLoader(mockParams);

			expect(allowSigning).toHaveBeenCalledOnce();
			expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

			expect(loadAddresses).toHaveBeenCalledOnce();
			expect(loadAddresses).toHaveBeenNthCalledWith(1, [ICP_TOKEN_ID, SOLANA_TOKEN_ID]);
		});
	});
});
