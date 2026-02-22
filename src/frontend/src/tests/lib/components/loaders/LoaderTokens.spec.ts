import * as erc1155Derived from '$eth/derived/erc1155.derived';
import * as erc20Derived from '$eth/derived/erc20.derived';
import * as erc4626Derived from '$eth/derived/erc4626.derived';
import * as erc721Derived from '$eth/derived/erc721.derived';
import { loadErc1155Tokens } from '$eth/services/erc1155.services';
import { loadErc20Tokens } from '$eth/services/erc20.services';
import { loadErc4626Tokens } from '$eth/services/erc4626.services';
import { loadErc721Tokens } from '$eth/services/erc721.services';
import * as extDerived from '$icp/derived/ext.derived';
import * as icPunksDerived from '$icp/derived/icpunks.derived';
import { loadExtTokens } from '$icp/services/ext.services';
import { loadIcPunksTokens } from '$icp/services/icpunks.services';
import { loadIcrcTokens } from '$icp/services/icrc.services';
import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
import * as appConstants from '$lib/constants/app.constants';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import * as splDerived from '$sol/derived/spl.derived';
import { loadSplTokens } from '$sol/services/spl.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
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
import { writable } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

vi.mock('$eth/services/erc20.services', () => ({
	loadErc20Tokens: vi.fn()
}));

vi.mock('$eth/services/erc721.services', () => ({
	loadErc721Tokens: vi.fn()
}));

vi.mock('$eth/services/erc1155.services', () => ({
	loadErc1155Tokens: vi.fn()
}));

vi.mock('$eth/services/erc4626.services', () => ({
	loadErc4626Tokens: vi.fn()
}));

vi.mock('$icp/services/icrc.services', () => ({
	loadIcrcTokens: vi.fn()
}));

vi.mock('$icp/services/ext.services', () => ({
	loadExtTokens: vi.fn()
}));

vi.mock('$icp/services/icpunks.services', () => ({
	loadIcPunksTokens: vi.fn()
}));

vi.mock('$sol/services/spl.services', () => ({
	loadSplTokens: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn().mockResolvedValue([])
}));

describe('LoaderTokens', () => {
	const erc20NotInitStore = writable(true);
	const erc721NotInitStore = writable(true);
	const erc1155NotInitStore = writable(true);
	const erc4626NotInitStore = writable(true);
	const erc721InitStore = writable(false);
	const erc1155InitStore = writable(false);
	const extNotInitStore = writable(true);
	const icPunksNotInitStore = writable(true);
	const splNotInitStore = writable(true);

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		// Set the route to the NFTs page to trigger the NFTs interval loaders
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Nfts}` });

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allDisabled');

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });

		erc20NotInitStore.set(true);
		erc721NotInitStore.set(true);
		erc1155NotInitStore.set(true);
		erc4626NotInitStore.set(true);
		erc721InitStore.set(false);
		erc1155InitStore.set(false);
		extNotInitStore.set(true);
		icPunksNotInitStore.set(true);
		splNotInitStore.set(true);

		vi.spyOn(erc20Derived, 'erc20CustomTokensNotInitialized', 'get').mockReturnValue(
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

		vi.spyOn(erc4626Derived, 'erc4626CustomTokensNotInitialized', 'get').mockReturnValue(
			erc4626NotInitStore
		);

		vi.spyOn(extDerived, 'extCustomTokensNotInitialized', 'get').mockReturnValue(extNotInitStore);

		vi.spyOn(icPunksDerived, 'icPunksCustomTokensNotInitialized', 'get').mockReturnValue(
			icPunksNotInitStore
		);

		vi.spyOn(splDerived, 'splCustomTokensNotInitialized', 'get').mockReturnValue(splNotInitStore);
	});

	it('should always load ICRC tokens', async () => {
		render(LoaderTokens);

		await waitFor(() => {
			expect(loadIcrcTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should always load EXT tokens', async () => {
		render(LoaderTokens);

		await waitFor(() => {
			expect(loadExtTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should always load ICPunks tokens', async () => {
		render(LoaderTokens);

		await waitFor(() => {
			expect(loadIcPunksTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should not load non-ICRC tokens if networks are all disabled', async () => {
		render(LoaderTokens);

		await waitFor(() => {
			expect(loadErc20Tokens).not.toHaveBeenCalled();
			expect(loadErc721Tokens).not.toHaveBeenCalled();
			expect(loadErc1155Tokens).not.toHaveBeenCalled();
			expect(loadErc4626Tokens).not.toHaveBeenCalled();
			expect(loadSplTokens).not.toHaveBeenCalled();
		});
	});

	it('should load non-ICRC tokens if networks are all enabled', async () => {
		render(LoaderTokens);

		setupUserNetworksStore('allEnabled');

		await waitFor(() => {
			expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadErc4626Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadExtTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadIcPunksTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	describe('ERC tokens', () => {
		it('should load ERC tokens when Ethereum or EVM is enabled and the stores are not initialized', async () => {
			erc20NotInitStore.set(true);
			erc721NotInitStore.set(true);
			erc1155NotInitStore.set(true);
			erc4626NotInitStore.set(true);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadErc20Tokens).not.toHaveBeenCalled();
				expect(loadErc721Tokens).not.toHaveBeenCalled();
				expect(loadErc1155Tokens).not.toHaveBeenCalled();
				expect(loadErc4626Tokens).not.toHaveBeenCalled();
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
				expect(loadErc4626Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			});
		});

		it('should not load ERC if the stores are already initialized', async () => {
			setupUserNetworksStore('allEnabled');

			erc20NotInitStore.set(false);
			erc721NotInitStore.set(false);
			erc1155NotInitStore.set(false);
			erc4626NotInitStore.set(false);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadErc20Tokens).not.toHaveBeenCalled();
				expect(loadErc721Tokens).not.toHaveBeenCalled();
				expect(loadErc1155Tokens).not.toHaveBeenCalled();
				expect(loadErc4626Tokens).not.toHaveBeenCalled();
			});
		});

		it('should load ERC tokens only when an Ethereum or EVM network is actually enabled', async () => {
			render(LoaderTokens);

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
				expect(loadErc4626Tokens).not.toHaveBeenCalled();
			});
		});

		it('should load ERC tokens for testnets if testnets are enabled and the stores are not initialized', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadErc20Tokens).not.toHaveBeenCalled();
				expect(loadErc721Tokens).not.toHaveBeenCalled();
				expect(loadErc1155Tokens).not.toHaveBeenCalled();
				expect(loadErc4626Tokens).not.toHaveBeenCalled();
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
			erc4626NotInitStore.set(true);

			await waitFor(() => {
				expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
				expect(loadErc4626Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			});
		});
	});

	describe('EXT tokens', () => {
		it('should not load EXT tokens if the stores are already initialized', async () => {
			setupUserNetworksStore('allEnabled');

			extNotInitStore.set(false);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadExtTokens).not.toHaveBeenCalled();
			});
		});
	});

	describe('ICPunks tokens', () => {
		it('should not load ICPunks tokens if the stores are already initialized', async () => {
			setupUserNetworksStore('allEnabled');

			icPunksNotInitStore.set(false);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadIcPunksTokens).not.toHaveBeenCalled();
			});
		});
	});

	describe('SPL tokens', () => {
		it('should load SPL tokens on Solana mainnet when the stores are not initialized', async () => {
			splNotInitStore.set(true);

			render(LoaderTokens);

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

		it('should not load SPL tokens if the stores are already initialized', async () => {
			setupUserNetworksStore('allEnabled');

			splNotInitStore.set(false);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadSplTokens).not.toHaveBeenCalled();
			});
		});

		it('should load SPL tokens on Solana devnet when testnets are enabled and the stores are not initialized', async () => {
			render(LoaderTokens);

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

		it('should load SPL tokens on Solana localnet only when LOCAL is true and the stores are not initialized', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadSplTokens).not.toHaveBeenCalled();
			});

			setupTestnetsStore('enabled');

			vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

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
