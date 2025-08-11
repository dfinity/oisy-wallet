import {
	loadBtcAddressMainnet,
	loadBtcAddressRegtest,
	loadBtcAddressTestnet
} from '$btc/services/btc-address.services';
import { loadEthAddress } from '$eth/services/eth-address.services';
import Loader from '$lib/components/loaders/Loader.svelte';
import * as appContants from '$lib/constants/app.constants';
import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
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
import { loading } from '$lib/stores/loader.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
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

vi.mock('$eth/services/erc20.services', () => ({
	loadErc20Tokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$eth/services/erc721.services', () => ({
	loadErc721Tokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$icp/services/icrc.services', () => ({
	loadIcrcTokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$sol/services/spl.services', () => ({
	loadSplTokens: vi.fn(() => Promise.resolve())
}));

describe('Loader', () => {
	const mockSnippet = createMockSnippet('Mock Snippet');

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allEnabled');
	});

	it('should not render modal if not loading', async () => {
		const { queryByTestId } = render(Loader, { children: mockSnippet });

		await waitFor(() => {
			expect(queryByTestId(LOADER_MODAL)).toBeNull();

			expect(get(loading)).toBeFalsy();
		});
	});

	it('should initialize the user profile and the mainnet addresses', async () => {
		render(Loader, { children: mockSnippet });

		await waitFor(() => {
			expect(initLoader).toHaveBeenCalledOnce();
		});
	});

	describe('while loading', () => {
		beforeEach(() => {
			loading.set(true);
			vi.mocked(initLoader).mockImplementationOnce(
				async ({ setProgressModal }: { setProgressModal: (value: boolean) => void }) => {
					setProgressModal(true);
					await Promise.resolve();
				}
			);
		});

		it('should render modal', async () => {
			const { getByTestId } = render(Loader, { children: mockSnippet });

			await waitFor(() => {
				expect(getByTestId(LOADER_MODAL)).toBeInTheDocument();
			});
		});

		it('should render the banner image', async () => {
			const { getByAltText } = render(Loader, { children: mockSnippet });

			const altText = replacePlaceholders(replaceOisyPlaceholders(en.init.alt.loader_banner), {
				$theme: 'light'
			});

			await waitFor(() => {
				const banner = getByAltText(altText);

				expect(banner).toBeInTheDocument();
			});
		});

		it('should not call any address loaders', async () => {
			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

			render(Loader, { children: mockSnippet });

			await waitFor(() => {
				expect(loadEthAddress).not.toHaveBeenCalled();
				expect(loadBtcAddressMainnet).not.toHaveBeenCalled();
				expect(loadSolAddressMainnet).not.toHaveBeenCalled();

				expect(loadBtcAddressTestnet).not.toHaveBeenCalled();
				expect(loadSolAddressDevnet).not.toHaveBeenCalled();

				expect(loadBtcAddressRegtest).not.toHaveBeenCalled();
				expect(loadSolAddressLocal).not.toHaveBeenCalled();
			});
		});
	});

	describe('handling testnets addresses', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			setupTestnetsStore('enabled');

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

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
								testnets: { show_testnets: true },
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
								testnets: { show_testnets: true },
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
				vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

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
