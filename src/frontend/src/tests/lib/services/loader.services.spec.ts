import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
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
import { userProfileStore } from '$lib/stores/user-profile.store';
import { LoadIdbAddressError } from '$lib/types/errors';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

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

		it('should work correctly', async () => {
			apiMock.mockResolvedValueOnce(undefined);

			const result = await initSignerAllowance();

			expect(result.success).toBeTruthy();
		});

		it('should handle errors', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			// Providing a custom IDB storage to AuthClient.create raises a console warning (purely informational).
			vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await initSignerAllowance();

			expect(result.success).toBeFalsy();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				"You are using a custom storage provider that may not support CryptoKey storage. If you are using a custom storage provider that does not support CryptoKey storage, you should use 'Ed25519' as the key type, as it can serialize to a string"
			);
		});

		it('should sign out and ultimately reload the window', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			// Providing a custom IDB storage to AuthClient.create raises a console warning (purely informational).
			vi.spyOn(console, 'warn').mockImplementation(() => {});

			const spySignOut = vi.spyOn(authServices, 'errorSignOut');

			const spy = vi.spyOn(window.location, 'reload');

			await initSignerAllowance();

			expect(spySignOut).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledOnce();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				"You are using a custom storage provider that may not support CryptoKey storage. If you are using a custom storage provider that does not support CryptoKey storage, you should use 'Ed25519' as the key type, as it can serialize to a string"
			);
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

			setupUserNetworksStore('allEnabled');
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

		describe('when the IDB addresses are not loaded', () => {
			beforeEach(() => {
				setupUserNetworksStore('allEnabled');

				mockAuthStore(mockIdentity);
				authStore.setForTesting(mockIdentity);

				vi.mocked(loadIdbAddresses).mockResolvedValue({
					success: false,
					err: [
						new LoadIdbAddressError(ETHEREUM_NETWORK_ID),
						new LoadIdbAddressError(SOLANA_MAINNET_NETWORK_ID)
					]
				});
			});

			it('should load addresses from the backend', async () => {
				await initLoader(mockParams);

				expect(allowSigning).toHaveBeenCalledOnce();
				expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

				expect(loadAddresses).toHaveBeenCalledOnce();
				expect(loadAddresses).toHaveBeenNthCalledWith(1, [
					ETHEREUM_NETWORK_ID,
					SOLANA_MAINNET_NETWORK_ID
				]);
			});

			it('should load addresses from the backend only for enabled networks', async () => {
				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								testnets: { show_testnets: true },
								networks: [
									[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BaseMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BscMainnet: null }, { enabled: false, is_testnet: false }],
									[{ PolygonMainnet: null }, { enabled: false, is_testnet: false }],
									[{ ArbitrumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]
								]
							}
						})
					}
				});

				await initLoader(mockParams);

				expect(allowSigning).toHaveBeenCalledOnce();
				expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

				expect(loadAddresses).toHaveBeenCalledOnce();
				expect(loadAddresses).toHaveBeenNthCalledWith(1, [SOLANA_MAINNET_NETWORK_ID]);
			});

			it('should load Ethereum address from the backend if even only one EVM network is enabled', async () => {
				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								testnets: { show_testnets: true },
								networks: [
									[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }],
									[{ BaseMainnet: null }, { enabled: true, is_testnet: false }],
									[{ BscMainnet: null }, { enabled: false, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: false, is_testnet: false }]
								]
							}
						})
					}
				});

				await initLoader(mockParams);

				expect(allowSigning).toHaveBeenCalledOnce();
				expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

				expect(loadAddresses).toHaveBeenCalledOnce();
				expect(loadAddresses).toHaveBeenNthCalledWith(1, [ETHEREUM_NETWORK_ID]);
			});

			it('should not load addresses from the backend if all networks are disabled', async () => {
				setupUserNetworksStore('allDisabled');

				await initLoader(mockParams);

				expect(allowSigning).toHaveBeenCalledOnce();
				expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

				expect(loadAddresses).toHaveBeenCalledOnce();
				expect(loadAddresses).toHaveBeenNthCalledWith(1, []);
			});
		});
	});
});
