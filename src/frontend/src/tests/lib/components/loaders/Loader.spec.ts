import {
	loadBtcAddressMainnet,
	loadBtcAddressRegtest,
	loadBtcAddressTestnet
} from '$btc/services/btc-address.services';
import * as erc1155Derived from '$eth/derived/erc1155.derived';
import * as erc20Derived from '$eth/derived/erc20.derived';
import * as erc721Derived from '$eth/derived/erc721.derived';
import { loadErc1155Tokens } from '$eth/services/erc1155.services';
import { loadErc20Tokens } from '$eth/services/erc20.services';
import { loadErc721Tokens } from '$eth/services/erc721.services';
import { loadEthAddress } from '$eth/services/eth-address.services';
import { loadIcrcTokens } from '$icp/services/icrc.services';
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
import * as splDerived from '$sol/derived/spl.derived';
import {
	loadSolAddressDevnet,
	loadSolAddressLocal,
	loadSolAddressMainnet
} from '$sol/services/sol-address.services';
import { loadSplTokens } from '$sol/services/spl.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
import { get, writable } from 'svelte/store';

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

vi.mock('$eth/services/erc1155.services', () => ({
	loadErc1155Tokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$icp/services/icrc.services', () => ({
	loadIcrcTokens: vi.fn(() => Promise.resolve())
}));

vi.mock('$sol/services/spl.services', () => ({
	loadSplTokens: vi.fn(() => Promise.resolve())
}));

describe('Loader', () => {
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

	describe('token loaders', () => {
		const erc20NotInitStore = writable(true);
		const erc721NotInitStore = writable(true);
		const erc1155NotInitStore = writable(true);
		const erc721InitStore = writable(false);
		const erc1155InitStore = writable(false);
		const splNotInitStore = writable(true);

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			setupTestnetsStore('disabled');
			setupUserNetworksStore('allDisabled');

			erc20NotInitStore.set(true);
			erc721NotInitStore.set(true);
			erc1155NotInitStore.set(true);
			erc721InitStore.set(false);
			erc1155InitStore.set(false);
			splNotInitStore.set(true);

			vi.spyOn(erc20Derived, 'erc20UserTokensNotInitialized', 'get').mockReturnValue(
				erc20NotInitStore
			);

			vi.spyOn(erc721Derived, 'erc721CustomTokensNotInitialized', 'get').mockReturnValue(
				erc721NotInitStore
			);

			vi.spyOn(erc721Derived, 'erc721CustomTokensInitialized', 'get').mockReturnValue(
				erc721InitStore
			);

			vi.spyOn(erc1155Derived, 'erc1155CustomTokensNotInitialized', 'get').mockReturnValue(
				erc1155NotInitStore
			);

			vi.spyOn(erc1155Derived, 'erc1155CustomTokensInitialized', 'get').mockReturnValue(
				erc1155InitStore
			);

			vi.spyOn(splDerived, 'splCustomTokensNotInitialized', 'get').mockReturnValue(splNotInitStore);
		});

		it('should always load ICRC tokens on init', async () => {
			render(Loader, { children: mockSnippet });

			await waitFor(() => {
				expect(loadIcrcTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			});
		});

		it('should not load non-ICRC tokens on init if networks are all disabled', async () => {
			render(Loader, { children: mockSnippet });

			await waitFor(() => {
				expect(loadErc20Tokens).not.toHaveBeenCalled();
				expect(loadErc721Tokens).not.toHaveBeenCalled();
				expect(loadErc1155Tokens).not.toHaveBeenCalled();
				expect(loadSplTokens).not.toHaveBeenCalled();
			});
		});

		it('should load non-ICRC tokens on init if networks are all enabled', async () => {
			render(Loader, { children: mockSnippet });

			setupUserNetworksStore('allEnabled');

			await waitFor(() => {
				expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			});
		});

		describe('ERC tokens', () => {
			it('loads ERC tokens when Ethereum or EVM is enabled and the stores are not initialized', async () => {
				erc20NotInitStore.set(true);
				erc721NotInitStore.set(true);
				erc1155NotInitStore.set(true);

				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadErc20Tokens).not.toHaveBeenCalled();
					expect(loadErc721Tokens).not.toHaveBeenCalled();
					expect(loadErc1155Tokens).not.toHaveBeenCalled();
				});

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [[{ EthereumMainnet: null }, { enabled: true, is_testnet: false }]]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
					expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
					expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				});
			});

			it('does not load ERC if the stores are already initialized', async () => {
				setupUserNetworksStore('allEnabled');

				erc20NotInitStore.set(false);
				erc721NotInitStore.set(false);
				erc1155NotInitStore.set(false);

				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadErc20Tokens).not.toHaveBeenCalled();
					expect(loadErc721Tokens).not.toHaveBeenCalled();
					expect(loadErc1155Tokens).not.toHaveBeenCalled();
				});
			});

			it('loads ERC tokens only when an Ethereum or EVM network is actually enabled', async () => {
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
									[{ BitcoinMainnet: null }, { enabled: true, is_testnet: false }],
									[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]
								]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadErc20Tokens).not.toHaveBeenCalled();
					expect(loadErc721Tokens).not.toHaveBeenCalled();
					expect(loadErc1155Tokens).not.toHaveBeenCalled();
				});
			});

			it('loads ERC tokens for testnets if testnets are enabled and the stores are not initialized', async () => {
				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadErc20Tokens).not.toHaveBeenCalled();
					expect(loadErc721Tokens).not.toHaveBeenCalled();
					expect(loadErc1155Tokens).not.toHaveBeenCalled();
				});

				setupTestnetsStore('enabled');

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [[{ EthereumSepolia: null }, { enabled: true, is_testnet: true }]]
							}
						})
					}
				});

				erc20NotInitStore.set(true);
				erc721NotInitStore.set(true);
				erc1155NotInitStore.set(true);

				await waitFor(() => {
					expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
					expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
					expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				});
			});
		});

		describe('SPL tokens', () => {
			it('loads SPL tokens on Solana mainnet when the stores are not initialized', async () => {
				splNotInitStore.set(true);

				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadSplTokens).not.toHaveBeenCalled();
				});

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [[{ SolanaMainnet: null }, { enabled: true, is_testnet: false }]]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				});
			});

			it('does not load SPL tokens if the stores are already initialized', async () => {
				setupUserNetworksStore('allEnabled');

				splNotInitStore.set(false);

				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadSplTokens).not.toHaveBeenCalled();
				});
			});

			it('loads SPL tokens on Solana devnet when testnets are enabled and the stores are not initialized', async () => {
				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadSplTokens).not.toHaveBeenCalled();
				});

				setupTestnetsStore('enabled');

				splNotInitStore.set(true);

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [[{ SolanaDevnet: null }, { enabled: true, is_testnet: true }]]
							}
						})
					}
				});

				await waitFor(() => {
					expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				});
			});

			it('loads SPL tokens on Solana localnet only when LOCAL is true and the stores are not initialized', async () => {
				render(Loader, { children: mockSnippet });

				await waitFor(() => {
					expect(loadSplTokens).not.toHaveBeenCalled();
				});

				setupTestnetsStore('enabled');

				vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

				userProfileStore.set({
					certified: false,
					profile: {
						...mockUserProfile,
						settings: toNullable({
							...mockUserSettings,
							networks: {
								...mockNetworksSettings,
								networks: [[{ SolanaLocal: null }, { enabled: true, is_testnet: true }]]
							}
						})
					}
				});

				splNotInitStore.set(true);

				await waitFor(() => {
					expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				});
			});
		});
	});
});
