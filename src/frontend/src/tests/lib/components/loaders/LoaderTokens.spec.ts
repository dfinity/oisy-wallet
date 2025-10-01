import * as erc1155Derived from '$eth/derived/erc1155.derived';
import * as erc20Derived from '$eth/derived/erc20.derived';
import * as erc721Derived from '$eth/derived/erc721.derived';
import { loadErc1155Tokens } from '$eth/services/erc1155.services';
import { loadErc20Tokens } from '$eth/services/erc20.services';
import { loadErc721Tokens } from '$eth/services/erc721.services';
import { loadIcrcTokens } from '$icp/services/icrc.services';
import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
import * as appContants from '$lib/constants/app.constants';
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
import { writable } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

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

describe('LoaderTokens', () => {
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

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });

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

	it('should always load ICRC tokens', async () => {
		render(LoaderTokens, { children: mockSnippet });

		await waitFor(() => {
			expect(loadIcrcTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	it('should not load non-ICRC tokens if networks are all disabled', async () => {
		render(LoaderTokens, { children: mockSnippet });

		await waitFor(() => {
			expect(loadErc20Tokens).not.toHaveBeenCalled();
			expect(loadErc721Tokens).not.toHaveBeenCalled();
			expect(loadErc1155Tokens).not.toHaveBeenCalled();
			expect(loadSplTokens).not.toHaveBeenCalled();
		});
	});

	it('should load non-ICRC tokens if networks are all enabled', async () => {
		render(LoaderTokens, { children: mockSnippet });

		setupUserNetworksStore('allEnabled');

		await waitFor(() => {
			expect(loadErc20Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadErc721Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadErc1155Tokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
			expect(loadSplTokens).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});
	});

	describe('ERC tokens', () => {
		it('should load ERC tokens when Ethereum or EVM is enabled and the stores are not initialized', async () => {
			erc20NotInitStore.set(true);
			erc721NotInitStore.set(true);
			erc1155NotInitStore.set(true);

			render(LoaderTokens, { children: mockSnippet });

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

		it('should not load ERC if the stores are already initialized', async () => {
			setupUserNetworksStore('allEnabled');

			erc20NotInitStore.set(false);
			erc721NotInitStore.set(false);
			erc1155NotInitStore.set(false);

			render(LoaderTokens, { children: mockSnippet });

			await waitFor(() => {
				expect(loadErc20Tokens).not.toHaveBeenCalled();
				expect(loadErc721Tokens).not.toHaveBeenCalled();
				expect(loadErc1155Tokens).not.toHaveBeenCalled();
			});
		});

		it('should load ERC tokens only when an Ethereum or EVM network is actually enabled', async () => {
			render(LoaderTokens, { children: mockSnippet });

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

		it('should load ERC tokens for testnets if testnets are enabled and the stores are not initialized', async () => {
			render(LoaderTokens, { children: mockSnippet });

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
		it('should load SPL tokens on Solana mainnet when the stores are not initialized', async () => {
			splNotInitStore.set(true);

			render(LoaderTokens, { children: mockSnippet });

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

			render(LoaderTokens, { children: mockSnippet });

			await waitFor(() => {
				expect(loadSplTokens).not.toHaveBeenCalled();
			});
		});

		it('should load SPL tokens on Solana devnet when testnets are enabled and the stores are not initialized', async () => {
			render(LoaderTokens, { children: mockSnippet });

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
			render(LoaderTokens, { children: mockSnippet });

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
