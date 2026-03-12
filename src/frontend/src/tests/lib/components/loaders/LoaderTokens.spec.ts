import { processCustomTokens as processErc1155CustomTokens } from '$eth/services/erc1155.services';
import {
	loadDefaultErc20Tokens,
	processCustomTokens as processErc20CustomTokens
} from '$eth/services/erc20.services';
import {
	loadDefaultErc4626Tokens,
	processCustomTokens as processErc4626CustomTokens
} from '$eth/services/erc4626.services';
import { processCustomTokens as processErc721CustomTokens } from '$eth/services/erc721.services';
import {
	loadDefaultExtTokens,
	processCustomTokens as processExtCustomTokens
} from '$icp/services/ext.services';
import {
	loadDefaultIcPunksTokens,
	processCustomTokens as processIcPunksCustomTokens
} from '$icp/services/icpunks.services';
import {
	loadDefaultIcrcTokens,
	processCustomTokens as processIcrcCustomTokens
} from '$icp/services/icrc.services';
import LoaderTokens from '$lib/components/loaders/LoaderTokens.svelte';
import * as appConstants from '$lib/constants/app.constants';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import {
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import {
	loadDefaultSplTokens,
	processCustomTokens as processSplCustomTokens
} from '$sol/services/spl.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
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
import type { Identity } from '@icp-sdk/core/agent';
import { render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		debounce: (fn: unknown) => fn
	};
});

vi.mock('$lib/services/custom-tokens.services', () => ({
	loadNetworkCustomTokens: vi.fn().mockResolvedValue([])
}));

vi.mock('$eth/services/erc20.services', () => ({
	loadDefaultErc20Tokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc721.services', () => ({
	processCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc1155.services', () => ({
	processCustomTokens: vi.fn()
}));

vi.mock('$eth/services/erc4626.services', () => ({
	loadDefaultErc4626Tokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$icp/services/icrc.services', () => ({
	loadDefaultIcrcTokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$icp/services/ext.services', () => ({
	loadDefaultExtTokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$icp/services/icpunks.services', () => ({
	loadDefaultIcPunksTokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$sol/services/spl.services', () => ({
	loadDefaultSplTokens: vi.fn(),
	processCustomTokens: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn().mockResolvedValue([])
}));

describe('LoaderTokens', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Nfts}` });

		setupTestnetsStore('disabled');
		setupUserNetworksStore('allDisabled');

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });
	});

	describe('Default token loading', () => {
		it('should always load ICRC default tokens', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadDefaultIcrcTokens).toHaveBeenCalled();
			});
		});

		it('should always load EXT default tokens', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadDefaultExtTokens).toHaveBeenCalled();
			});
		});

		it('should always load ICPunks default tokens', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadDefaultIcPunksTokens).toHaveBeenCalled();
			});
		});

		it('should not load ERC or SPL defaults if networks are all disabled', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadDefaultErc20Tokens).not.toHaveBeenCalled();
				expect(loadDefaultErc4626Tokens).not.toHaveBeenCalled();
				expect(loadDefaultSplTokens).not.toHaveBeenCalled();
			});
		});

		it('should load ERC defaults when Ethereum is enabled', async () => {
			render(LoaderTokens);

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
				expect(loadDefaultErc20Tokens).toHaveBeenCalled();
				expect(loadDefaultErc4626Tokens).toHaveBeenCalled();
			});
		});

		it('should load SPL defaults when Solana mainnet is enabled', async () => {
			render(LoaderTokens);

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
				expect(loadDefaultSplTokens).toHaveBeenCalled();
			});
		});
	});

	describe('Custom token loading', () => {
		it('should fetch custom tokens via a single loadNetworkCustomTokens call', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(loadNetworkCustomTokens).toHaveBeenCalled();
			});

			const { calls } = vi.mocked(loadNetworkCustomTokens).mock;
			const uniqueIdentities = new Set(calls.map(([{ certified }]) => certified));

			expect(uniqueIdentities.size).toBeLessThanOrEqual(2);
		});

		it('should always process ICRC, EXT, and ICPunks custom tokens', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processIcrcCustomTokens).toHaveBeenCalled();
				expect(processExtCustomTokens).toHaveBeenCalled();
				expect(processIcPunksCustomTokens).toHaveBeenCalled();
			});
		});

		it('should not process ERC or SPL custom tokens if networks are all disabled', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processIcrcCustomTokens).toHaveBeenCalled();
			});

			expect(processErc20CustomTokens).not.toHaveBeenCalled();
			expect(processErc721CustomTokens).not.toHaveBeenCalled();
			expect(processErc1155CustomTokens).not.toHaveBeenCalled();
			expect(processErc4626CustomTokens).not.toHaveBeenCalled();
			expect(processSplCustomTokens).not.toHaveBeenCalled();
		});

		it('should process all custom tokens when networks are all enabled', async () => {
			setupUserNetworksStore('allEnabled');

			render(LoaderTokens);

			await waitFor(() => {
				expect(processIcrcCustomTokens).toHaveBeenCalled();
				expect(processErc20CustomTokens).toHaveBeenCalled();
				expect(processErc721CustomTokens).toHaveBeenCalled();
				expect(processErc1155CustomTokens).toHaveBeenCalled();
				expect(processErc4626CustomTokens).toHaveBeenCalled();
				expect(processSplCustomTokens).toHaveBeenCalled();
				expect(processExtCustomTokens).toHaveBeenCalled();
				expect(processIcPunksCustomTokens).toHaveBeenCalled();
			});
		});
	});

	describe('ERC tokens', () => {
		it('should load ERC defaults and process custom tokens when Ethereum is enabled', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processErc20CustomTokens).not.toHaveBeenCalled();
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
				expect(loadDefaultErc20Tokens).toHaveBeenCalled();
				expect(loadDefaultErc4626Tokens).toHaveBeenCalled();
				expect(processErc20CustomTokens).toHaveBeenCalled();
				expect(processErc721CustomTokens).toHaveBeenCalled();
				expect(processErc1155CustomTokens).toHaveBeenCalled();
				expect(processErc4626CustomTokens).toHaveBeenCalled();
			});
		});

		it('should not process ERC custom tokens when EVM networks are explicitly disabled', async () => {
			ethAddressStore.reset();

			render(LoaderTokens);

			await waitFor(() => {
				expect(processIcrcCustomTokens).toHaveBeenCalled();
			});

			expect(processErc20CustomTokens).not.toHaveBeenCalled();
			expect(processErc721CustomTokens).not.toHaveBeenCalled();
			expect(processErc1155CustomTokens).not.toHaveBeenCalled();
			expect(processErc4626CustomTokens).not.toHaveBeenCalled();
		});

		it('should load ERC tokens for testnets when testnets are enabled', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processErc20CustomTokens).not.toHaveBeenCalled();
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

			await waitFor(() => {
				expect(loadDefaultErc20Tokens).toHaveBeenCalled();
				expect(processErc20CustomTokens).toHaveBeenCalled();
				expect(processErc721CustomTokens).toHaveBeenCalled();
				expect(processErc1155CustomTokens).toHaveBeenCalled();
				expect(processErc4626CustomTokens).toHaveBeenCalled();
			});
		});
	});

	describe('SPL tokens', () => {
		it('should load SPL tokens on Solana mainnet', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processSplCustomTokens).not.toHaveBeenCalled();
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
				expect(loadDefaultSplTokens).toHaveBeenCalled();
				expect(processSplCustomTokens).toHaveBeenCalled();
			});
		});

		it('should load SPL tokens on Solana devnet when testnets are enabled', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processSplCustomTokens).not.toHaveBeenCalled();
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
							networks: [[{ SolanaDevnet: null }, { enabled: true, is_testnet: true }]]
						}
					})
				}
			});

			await waitFor(() => {
				expect(loadDefaultSplTokens).toHaveBeenCalled();
				expect(processSplCustomTokens).toHaveBeenCalled();
			});
		});

		it('should load SPL tokens on Solana localnet only when LOCAL is true', async () => {
			render(LoaderTokens);

			await waitFor(() => {
				expect(processSplCustomTokens).not.toHaveBeenCalled();
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

			await waitFor(() => {
				expect(loadDefaultSplTokens).toHaveBeenCalled();
				expect(processSplCustomTokens).toHaveBeenCalled();
			});
		});
	});

	describe('Identity changes', () => {
		const identityB = {
			...mockIdentity,
			getPrincipal: () => mockPrincipal2
		} as unknown as Identity;

		it('should re-fetch custom tokens when identity changes', async () => {
			const identityStore = writable(mockIdentity as Identity | null);
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identityStore);

			render(LoaderTokens);

			await waitFor(() => {
				expect(loadNetworkCustomTokens).toHaveBeenCalled();
			});

			const callsBefore = vi.mocked(loadNetworkCustomTokens).mock.calls.length;

			identityStore.set(identityB);

			await waitFor(() => {
				expect(vi.mocked(loadNetworkCustomTokens).mock.calls.length).toBeGreaterThan(callsBefore);
			});
		});

		it('should discard stale responses from a previous identity', async () => {
			const identityStore = writable(mockIdentity as Identity | null);
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identityStore);

			let resolveStaleUpdate!: (value: never[]) => void;

			vi.mocked(loadNetworkCustomTokens)
				.mockResolvedValueOnce([])
				.mockImplementationOnce(
					() =>
						new Promise((resolve) => {
							resolveStaleUpdate = resolve;
						})
				)
				.mockResolvedValue([]);

			render(LoaderTokens);

			// Identity A's query path resolves → processing fires
			await waitFor(() => {
				expect(processIcrcCustomTokens).toHaveBeenCalled();
			});

			const callsAfterA = vi.mocked(processIcrcCustomTokens).mock.calls.length;

			// Change identity → new queryAndUpdate starts, old one still in-flight
			identityStore.set(identityB);

			// Identity B's responses resolve → processing fires again
			await waitFor(() => {
				expect(vi.mocked(processIcrcCustomTokens).mock.calls.length).toBeGreaterThan(callsAfterA);
			});

			const callsAfterB = vi.mocked(processIcrcCustomTokens).mock.calls.length;

			// NOW resolve the stale update from identity A — generation counter should discard it
			resolveStaleUpdate([]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// No additional processing should have occurred
			expect(vi.mocked(processIcrcCustomTokens).mock.calls).toHaveLength(callsAfterB);
		});
	});
});
