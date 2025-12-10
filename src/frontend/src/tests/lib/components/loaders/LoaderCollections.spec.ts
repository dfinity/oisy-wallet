import type { CustomToken } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EXT_BUILTIN_TOKENS } from '$env/tokens/tokens-ext/tokens.ext.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import * as extTokenApi from '$icp/api/ext-v2-token.api';
import * as extCustomTokens from '$icp/services/ext-custom-tokens.services';
import { listCustomTokens } from '$lib/api/backend.api';
import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
import * as saveCustomTokens from '$lib/services/save-custom-tokens.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { emit } from '$lib/utils/events.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

describe('LoaderCollections', () => {
	let alchemyProvidersSpy: MockInstance;
	let extGetTokensByOwnerSpy: MockInstance;
	let extCustomTokensSpy: MockInstance;
	let saveCustomTokensSpy: MockInstance;

	const mockGetTokensForOwner = vi.fn();

	const mockEventCallback = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');
		alchemyProvidersSpy.mockReturnValue({
			getTokensForOwner: mockGetTokensForOwner
		} as unknown as AlchemyProvider);

		extGetTokensByOwnerSpy = vi.spyOn(extTokenApi, 'getTokensByOwner');
		extGetTokensByOwnerSpy.mockResolvedValue([]);

		extCustomTokensSpy = vi.spyOn(extCustomTokens, 'saveCustomTokens');
		extCustomTokensSpy.mockResolvedValue(undefined);

		saveCustomTokensSpy = vi.spyOn(saveCustomTokens, 'saveCustomTokens');
		saveCustomTokensSpy.mockResolvedValue(undefined);

		mockAuthStore();

		ethAddressStore.set({ data: mockEthAddress, certified: false });

		mockGetTokensForOwner.mockResolvedValue([]);

		vi.mocked(listCustomTokens).mockResolvedValue([]);
	});

	it('should add new ERC collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress, isSpam: false, standard: 'erc1155' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			for (const network of networks) {
				expect(saveCustomTokensSpy).toHaveBeenCalledWith({
					tokens: [
						{
							address: mockEthAddress,
							chainId: network.chainId,
							networkKey: 'Erc721',
							enabled: true
						},
						{
							address: mockEthAddress,
							chainId: network.chainId,
							networkKey: 'Erc1155',
							enabled: true
						}
					],
					identity: mockIdentity
				});
			}
		});
	});

	it('should not add new EXT collections by default', async () => {
		extGetTokensByOwnerSpy.mockReset().mockResolvedValueOnce([1, 2, 3]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).not.toHaveBeenCalled();
			expect(extCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should add new EXT collections if the event is triggered', async () => {
		extGetTokensByOwnerSpy.mockReset().mockResolvedValueOnce([1, 2, 3]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(extCustomTokensSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						canisterId: EXT_BUILTIN_TOKENS[0].canisterId,
						network: ICP_NETWORK,
						enabled: true
					}
				]
			});

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add ERC collections if there are no new collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		mockGetTokensForOwner.mockResolvedValue([]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add EXT collections if there are no new collections', async () => {
		extGetTokensByOwnerSpy.mockReset().mockResolvedValueOnce([]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(extCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should not add existing ERC collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		const existingErc721CustomTokens: CustomToken[] = networks.map((network) => ({
			token: {
				Erc721: {
					token_address: mockEthAddress,
					chain_id: network.chainId
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(false)
		}));
		const existingErc1155CustomTokens: CustomToken[] = networks.map((network) => ({
			token: {
				Erc1155: {
					token_address: mockEthAddress,
					chain_id: network.chainId
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(true)
		}));

		vi.mocked(listCustomTokens).mockResolvedValue([
			...existingErc721CustomTokens,
			...existingErc1155CustomTokens
		]);

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress, isSpam: false, standard: 'erc1155' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(saveCustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add existing EXT collections', async () => {
		const existingExtCustomToken: CustomToken = {
			token: {
				ExtV2: {
					canister_id: Principal.fromText(EXT_BUILTIN_TOKENS[0].canisterId)
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(false)
		};

		vi.mocked(listCustomTokens).mockResolvedValue([existingExtCustomToken]);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length - 1);

			EXT_BUILTIN_TOKENS.slice(1).forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(extCustomTokensSpy).not.toHaveBeenCalled();

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});

	it('should handle EXT error gracefully', async () => {
		const mockError = new Error('EXT error');
		extGetTokensByOwnerSpy.mockRejectedValueOnce(mockError);

		render(LoaderCollections);

		emit({ message: 'oisyReloadCollections', detail: { callback: mockEventCallback } });

		await waitFor(() => {
			expect(extGetTokensByOwnerSpy).toHaveBeenCalledTimes(EXT_BUILTIN_TOKENS.length);

			EXT_BUILTIN_TOKENS.forEach(({ canisterId }, index) => {
				expect(extGetTokensByOwnerSpy).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					owner: mockPrincipal,
					canisterId,
					certified: false
				});
			});

			expect(extCustomTokensSpy).not.toHaveBeenCalled();

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Error fetching EXT tokens from canister ${EXT_BUILTIN_TOKENS[0].canisterId}:`,
				mockError
			);

			expect(mockEventCallback).toHaveBeenCalledExactlyOnceWith();
		});
	});
});
