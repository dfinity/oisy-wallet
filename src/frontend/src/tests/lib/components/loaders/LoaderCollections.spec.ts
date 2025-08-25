import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
import * as nftEnv from '$env/nft.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import * as erc721CustomTokens from '$eth/services/erc721-custom-tokens.services';
import { listCustomTokens } from '$lib/api/backend.api';
import LoaderCollections from '$lib/components/loaders/LoaderCollections.svelte';
import { ethAddressStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	listCustomTokens: vi.fn()
}));

describe('LoaderCollections', () => {
	let alchemyProvidersSpy: MockInstance;
	let erc721CustomTokensSpy: MockInstance;

	const mockGetTokensForOwner = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		alchemyProvidersSpy = vi.spyOn(alchemyProvidersModule, 'alchemyProviders');
		alchemyProvidersSpy.mockReturnValue({
			getTokensForOwner: mockGetTokensForOwner
		} as unknown as AlchemyProvider);

		erc721CustomTokensSpy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens');
		erc721CustomTokensSpy.mockResolvedValue(undefined);

		vi.spyOn(nftEnv, 'NFTS_ENABLED', 'get').mockImplementation(() => true);

		mockAuthStore();

		ethAddressStore.set({ data: mockEthAddress, certified: false });
	});

	it('should add new collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		vi.mocked(listCustomTokens).mockResolvedValue([]);

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			for (const network of networks) {
				expect(erc721CustomTokensSpy).toHaveBeenCalledWith({
					tokens: [
						{
							address: mockEthAddress,
							network,
							enabled: true
						}
					],
					identity: mockIdentity
				});
			}
		});
	});

	it('should not add collections if there are no new collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		vi.mocked(listCustomTokens).mockResolvedValue([]);

		mockGetTokensForOwner.mockResolvedValue([]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(erc721CustomTokensSpy).not.toHaveBeenCalled();
		});
	});

	it('should not add existing collections', async () => {
		const networks = [...SUPPORTED_EVM_MAINNET_NETWORKS, ...SUPPORTED_ETHEREUM_MAINNET_NETWORKS];

		const existingErc721CustomTokens = networks.map((network) => ({
			token: { Erc721: { token_address: mockEthAddress, chain_id: network.chainId } },
			version: toNullable(1n),
			enabled: true
		}));

		vi.mocked(listCustomTokens).mockResolvedValue(existingErc721CustomTokens);

		mockGetTokensForOwner.mockResolvedValue([
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' }
		]);

		render(LoaderCollections);

		await waitFor(() => {
			expect(mockGetTokensForOwner).toHaveBeenCalledTimes(networks.length);

			expect(erc721CustomTokensSpy).not.toHaveBeenCalled();
		});
	});
});
