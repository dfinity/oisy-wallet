import { loadBtcAddressRegtest, loadBtcAddressTestnet } from '$btc/services/btc-address.services';
import * as networksEnv from '$env/networks/networks.env';
import { loadEthAddress } from '$eth/services/eth-address.services';
import Loader from '$lib/components/loaders/Loader.svelte';
import * as appContants from '$lib/constants/app.constants';
import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
import { loadIdbAddresses } from '$lib/services/addresses.services';
import {
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import { loading } from '$lib/stores/loader.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressTestnet
} from '$sol/services/sol-address.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { toNullable } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

vi.mock('$lib/services/load-user-profile.services', () => ({
	loadUserProfile: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('$lib/services/addresses.services', () => ({
	loadIdbAddresses: vi.fn(() => Promise.resolve({ success: true })),
	loadAddresses: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('$lib/services/loader.services', () => ({
	initSignerAllowance: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('$lib/services/auth.services', () => ({
	signOut: vi.fn()
}));

vi.mock('$btc/services/btc-address.services', () => ({
	loadBtcAddressRegtest: vi.fn(() => {
		btcAddressRegtestStore.set({ data: mockBtcAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadBtcAddressTestnet: vi.fn(() => {
		btcAddressTestnetStore.set({ data: mockBtcAddress, certified: false });
		return Promise.resolve({ success: true });
	})
}));

vi.mock('$eth/services/eth-address.services', () => ({
	loadEthAddress: vi.fn(() => {
		ethAddressStore.set({ data: mockEthAddress, certified: false });
		return Promise.resolve({ success: true });
	})
}));

vi.mock('$sol/services/sol-address.services', () => ({
	loadSolAddressDevnet: vi.fn(() => {
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadSolAddressLocal: vi.fn(() => {
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadSolAddressTestnet: vi.fn(() => {
		solAddressTestnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	})
}));

vi.mock('$lib/services/erc20.services', () => ({
	loadErc20Tokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/services/icrc.services', () => ({
	loadIcrcTokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$sol/services/spl.services', () => ({
	loadSplTokens: vi.fn(() => Promise.resolve())
}));

describe('Loader', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(networksEnv, 'USER_NETWORKS_FEATURE_ENABLED', 'get').mockImplementation(() => true);

		mockAuthStore();

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allEnabled');
	});

	it('should not render modal if not loading', async () => {
		const { queryByTestId } = render(Loader);

		await waitFor(() => {
			expect(queryByTestId(LOADER_MODAL)).toBeNull();

			expect(get(loading)).toBe(false);
		});
	});

	describe('while loading', () => {
		beforeEach(() => {
			loading.set(true);
			vi.mocked(loadIdbAddresses).mockResolvedValueOnce({ success: false });
		});

		it('should render modal', async () => {
			const { getByTestId } = render(Loader);

			await waitFor(() => {
				expect(getByTestId(LOADER_MODAL)).toBeInTheDocument();
			});
		});

		it('should render the banner image', async () => {
			const { getByAltText } = render(Loader);

			const altText = replacePlaceholders(replaceOisyPlaceholders(en.init.alt.loader_banner), {
				$theme: 'light'
			});

			await waitFor(() => {
				const banner = getByAltText(altText);
				expect(banner).toBeInTheDocument();
			});
		});
	});

	describe('handling testnets addresses', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			setupTestnetsStore('enabled');

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

			ethAddressStore.reset();

			btcAddressTestnetStore.reset();
			btcAddressRegtestStore.reset();

			solAddressTestnetStore.reset();
			solAddressDevnetStore.reset();
			solAddressLocalnetStore.reset();
		});

		it('should not call any loaders when testnets are disabled', () => {
			setupTestnetsStore('disabled');

			render(Loader);

			expect(loadEthAddress).not.toHaveBeenCalled();
			expect(loadBtcAddressTestnet).not.toHaveBeenCalled();
			expect(loadSolAddressTestnet).not.toHaveBeenCalled();
			expect(loadSolAddressDevnet).not.toHaveBeenCalled();
		});

		describe('when testnets are enabled', () => {
			beforeEach(() => {
				vi.clearAllMocks();

				setupTestnetsStore('enabled');
			});

			it('should call loaders only for the enabled testnet networks', () => {
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
									[{ SolanaTestnet: null }, { enabled: true, is_testnet: true }],
									[{ SolanaDevnet: null }, { enabled: false, is_testnet: true }]
								]
							}
						})
					}
				});

				render(Loader);

				expect(loadSolAddressTestnet).toHaveBeenCalledTimes(1);
				expect(loadSolAddressDevnet).not.toHaveBeenCalled();
			});

			it('should call loaders if addresses are not loaded yet', () => {
				render(Loader);

				expect(loadEthAddress).toHaveBeenCalledTimes(1);
				expect(loadBtcAddressTestnet).toHaveBeenCalledTimes(1);
				expect(loadSolAddressTestnet).toHaveBeenCalledTimes(1);
				expect(loadSolAddressDevnet).toHaveBeenCalledTimes(1);

				expect(loadBtcAddressRegtest).not.toHaveBeenCalled();
				expect(loadSolAddressLocal).not.toHaveBeenCalled();
			});

			it('should not call loaders if addresses are already loaded', () => {
				ethAddressStore.set({ data: mockEthAddress, certified: false });
				btcAddressTestnetStore.set({ data: mockBtcAddress, certified: false });
				solAddressTestnetStore.set({ data: mockSolAddress, certified: false });
				solAddressDevnetStore.set({ data: mockSolAddress, certified: false });

				render(Loader);

				expect(loadEthAddress).not.toHaveBeenCalled();
				expect(loadBtcAddressTestnet).not.toHaveBeenCalled();
				expect(loadSolAddressTestnet).not.toHaveBeenCalled();
				expect(loadSolAddressDevnet).not.toHaveBeenCalled();
			});

			it('should call local addresses loaders when in local env', () => {
				vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

				render(Loader);

				expect(loadBtcAddressRegtest).toHaveBeenCalledTimes(1);
				expect(loadSolAddressLocal).toHaveBeenCalledTimes(1);
			});
		});
	});
});
