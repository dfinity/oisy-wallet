import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { allowSigning } from '$lib/api/backend.api';
import { loadAddresses } from '$lib/services/addresses.services';
import * as authServices from '$lib/services/auth.services';
import { nullishSignOut, signOut } from '$lib/services/auth.services';
import { loadUserProfile } from '$lib/services/load-user-profile.services';
import { initLoader } from '$lib/services/loader.services';
import { authStore } from '$lib/stores/auth.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { toNullable } from '@dfinity/utils';

vi.mock('$lib/services/load-user-profile.services', () => ({
	loadUserProfile: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('$lib/services/addresses.services', () => ({
	loadIdbAddresses: vi.fn(() => Promise.resolve({ success: true })),
	loadAddresses: vi.fn(() => Promise.resolve({ success: true }))
}));

describe('loader.services', () => {
	describe('initLoader', () => {
		const mockValidateAddresses = vi.fn();
		const mockProgressAndLoad = vi.fn();

		const mockParams = {
			identity: mockIdentity,
			validateAddresses: mockValidateAddresses,
			progressAndLoad: mockProgressAndLoad
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			vi.spyOn(authServices, 'signOut').mockImplementation(vi.fn());
			vi.spyOn(authServices, 'nullishSignOut').mockImplementation(vi.fn());

			setupUserNetworksStore('allEnabled');

			mockAuthStore(mockIdentity);
			authStore.setForTesting(mockIdentity);
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

		it('should load addresses from the backend', async () => {
			await initLoader(mockParams);

			expect(allowSigning).toHaveBeenCalledOnce();
			expect(allowSigning).toHaveBeenNthCalledWith(1, { identity: mockIdentity });

			expect(loadAddresses).toHaveBeenCalledOnce();
			expect(loadAddresses).toHaveBeenNthCalledWith(1, [
				BTC_MAINNET_NETWORK_ID,
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
								[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
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
								[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
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
