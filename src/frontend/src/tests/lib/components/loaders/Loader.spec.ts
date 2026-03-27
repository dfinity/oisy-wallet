import {
	loadBtcAddressMainnet,
	loadBtcAddressRegtest,
	loadBtcAddressTestnet
} from '$btc/services/btc-address.services';
import { loadEthAddress } from '$eth/services/eth-address.services';
import Loader from '$lib/components/loaders/Loader.svelte';
import * as appConstants from '$lib/constants/app.constants';
import { initLoader } from '$lib/services/loader.services';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
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

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

vi.mock('$lib/services/loader.services', () => ({
	initSignerAllowance: vi.fn(() => Promise.resolve({ success: true })),
	initLoader: vi
		.fn()
		.mockImplementation(async ({ progressAndLoad }: { progressAndLoad: () => Promise<void> }) => {
			await progressAndLoad();
		})
}));

vi.mock('$btc/services/btc-address.services', () => ({
	loadBtcAddressMainnet: vi.fn(() => {
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadBtcAddressTestnet: vi.fn(() => {
		btcAddressTestnetStore.set({ data: mockBtcAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadBtcAddressRegtest: vi.fn(() => {
		btcAddressRegtestStore.set({ data: mockBtcAddress, certified: false });
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
	loadSolAddressMainnet: vi.fn(() => {
		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadSolAddressDevnet: vi.fn(() => {
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	}),
	loadSolAddressLocal: vi.fn(() => {
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });
		return Promise.resolve({ success: true });
	})
}));

describe('Loader', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allEnabled');
	});

	it('should initialize the user profile and the mainnet addresses', async () => {
		render(Loader, { children: mockSnippet });

		await waitFor(() => {
			expect(initLoader).toHaveBeenCalledOnce();
		});
	});

	describe('handling testnets addresses', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			setupTestnetsStore('enabled');

			vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);

			ethAddressStore.reset();

			btcAddressMainnetStore.reset();
			btcAddressTestnetStore.reset();
			btcAddressRegtestStore.reset();

			solAddressMainnetStore.reset();
			solAddressDevnetStore.reset();
			solAddressLocalnetStore.reset();
		});

		describe('when testnets are disabled', () => {
			beforeEach(() => {
				vi.clearAllMocks();

				setupTestnetsStore('disabled');
			});

			it('should call only mainnet loaders if addresses are not loaded yet', async () => {
				setupTestnetsStore('disabled');

				render(Loader, { children: mockSnippet });

				// Toggle the reactive statement
				setupUserNetworksStore('allDisabled');
				setupUserNetworksStore('onlyMainnets');

				await waitFor(() => {
					expect(loadEthAddress).toHaveBeenCalledOnce();
					expect(loadBtcAddressMainnet).toHaveBeenCalledOnce();
					expect(loadSolAddressMainnet).toHaveBeenCalledOnce();

					expect(loadBtcAddressTestnet).not.toHaveBeenCalled();
					expect(loadSolAddressDevnet).not.toHaveBeenCalled();
				});
			});

			it('should not call loaders if addresses are already loaded', async () => {
				ethAddressStore.set({ data: mockEthAddress, certified: false });
				btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });
				solAddressMainnetStore.set({ data: mockSolAddress, certified: false });

				render(Loader, { children: mockSnippet });

				// Toggle the reactive statement
				setupUserNetworksStore('allDisabled');
				setupUserNetworksStore('onlyMainnets');

				await waitFor(() => {
					expect(loadEthAddress).not.toHaveBeenCalled();
					expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
					expect(loadSolAddressMainnet).not.toHaveBeenCalled();
				});
			});

			it('should call loaders only for the enabled mainnet networks', async () => {
				setupUserNetworksStore('allDisabled');

				render(Loader, { children: mockSnippet });

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [
									[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]
								]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
					expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
				});
			});
		});

		describe('when testnets are enabled', () => {
			beforeEach(() => {
				vi.clearAllMocks();

				setupTestnetsStore('enabled');
			});

			it('should call loaders only for the enabled networks', async () => {
				setupUserNetworksStore('allDisabled');

				render(Loader, { children: mockSnippet });

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [
									[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }],
									[{ SolanaDevnet: null }, { enabled: false, is_testnet: true }]
								]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
					expect(loadSolAddressMainnet).toHaveBeenCalledOnce();
					expect(loadSolAddressDevnet).not.toHaveBeenCalled();
				});
			});

			it('should call testnet loaders if addresses are not loaded yet', async () => {
				setupUserNetworksStore('allDisabled');

				render(Loader, { children: mockSnippet });

				setupUserNetworksStore('allEnabled');

				await waitFor(() => {
					expect(loadEthAddress).toHaveBeenCalledOnce();
					expect(loadBtcAddressTestnet).toHaveBeenCalledOnce();
					expect(loadSolAddressDevnet).toHaveBeenCalledOnce();

					expect(loadBtcAddressRegtest).not.toHaveBeenCalled();
					expect(loadSolAddressLocal).not.toHaveBeenCalled();
				});
			});

			it('should not call loaders if addresses are already loaded', async () => {
				ethAddressStore.set({ data: mockEthAddress, certified: false });
				btcAddressTestnetStore.set({ data: mockBtcAddress, certified: false });
				solAddressDevnetStore.set({ data: mockSolAddress, certified: false });

				render(Loader, { children: mockSnippet });

				// Toggle the reactive statement
				setupUserNetworksStore('allDisabled');
				setupUserNetworksStore('allEnabled');

				await waitFor(() => {
					expect(loadEthAddress).not.toHaveBeenCalled();
					expect(loadBtcAddressTestnet).not.toHaveBeenCalled();
					expect(loadSolAddressDevnet).not.toHaveBeenCalled();
				});
			});

			it('should call local addresses loaders when in local env', async () => {
				vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

				render(Loader, { children: mockSnippet });

				// Toggle the reactive statement
				setupUserNetworksStore('allDisabled');
				setupUserNetworksStore('allEnabled');

				await waitFor(() => {
					expect(loadBtcAddressRegtest).toHaveBeenCalledOnce();
					expect(loadSolAddressLocal).toHaveBeenCalledOnce();
				});
			});
		});
	});
});
