import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import { loadNftsByNetwork } from '$eth/services/nft.services';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { Network } from 'ethers/providers';

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(),
	AlchemyProvider: vi.fn()
}));

describe('nft.services', () => {
	const mockAlchemyProvider = {
		network: new Network('ethereum', 1),
		provider: {},
		getNftsByOwner: vi.fn()
	} as unknown as AlchemyProvider;

	describe('loadNftsByNetwork', () => {
		const mockNft1 = {
			...mockValidErc721Nft,
			id: parseNftId('123'),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft2 = {
			...mockValidErc721Nft,
			id: parseNftId('321'),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft3 = {
			...mockValidErc1155Nft,
			id: parseNftId('876'),
			collection: {
				...mockValidErc1155Nft.collection,
				address: NYAN_CAT_TOKEN.address,
				network: NYAN_CAT_TOKEN.network
			}
		};

		const erc721AzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true };
		const erc1155NyanCatToken = { ...NYAN_CAT_TOKEN, version: BigInt(1), enabled: true };
		const mockWalletAddress = mockEthAddress;

		const mockParams = {
			networkId: erc721AzukiToken.network.id,
			tokens: [erc721AzukiToken, erc1155NyanCatToken],
			walletAddress: mockWalletAddress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(alchemyProviders).mockReturnValue(mockAlchemyProvider);
		});

		it('should not load NFTs if no tokens were provided', async () => {
			await expect(loadNftsByNetwork({ ...mockParams, tokens: [] })).resolves.toStrictEqual([]);

			expect(mockAlchemyProvider.getNftsByOwner).not.toHaveBeenCalled();
		});

		it('should not load NFTs if the address is nullish', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, walletAddress: undefined })
			).resolves.toStrictEqual([]);

			await expect(
				loadNftsByNetwork({ ...mockParams, walletAddress: null })
			).resolves.toStrictEqual([]);

			expect(mockAlchemyProvider.getNftsByOwner).not.toHaveBeenCalled();
		});

		it('should load ERC721 NFTs', async () => {
			const tokens: EthNonFungibleToken[] = [erc721AzukiToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft1, mockNft2]);

			await expect(
				loadNftsByNetwork({ ...mockParams, tokens, networkId: erc721AzukiToken.network.id })
			).resolves.toStrictEqual([mockNft1, mockNft2]);
		});

		it('should load ERC1155 NFTs', async () => {
			const tokens: EthNonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft3]);

			await expect(
				loadNftsByNetwork({ ...mockParams, tokens, networkId: erc1155NyanCatToken.network.id })
			).resolves.toStrictEqual([mockNft3]);
		});

		it('should call the provider in batches', async () => {
			// The service calls the provider in batches of 40 tokens.
			const size = 40;
			const n = 3;

			const tokens: EthNonFungibleToken[] = Array.from(
				{ length: size * n },
				() => erc721AzukiToken
			);

			await loadNftsByNetwork({ ...mockParams, tokens });

			expect(mockAlchemyProvider.getNftsByOwner).toHaveBeenCalledTimes(n);

			Array.from({ length: n }).forEach((_, index) => {
				const callNumber = index + 1;
				const start = index * size;
				const end = start + size;

				expect(mockAlchemyProvider.getNftsByOwner).toHaveBeenNthCalledWith(callNumber, {
					address: mockWalletAddress,
					tokens: tokens.slice(start, end)
				});
			});
		});

		it('should handle loading error gracefully', async () => {
			const tokens: EthNonFungibleToken[] = [erc1155NyanCatToken];

			const mockError = new Error('Nfts Error');

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockRejectedValueOnce(mockError);

			await loadNftsByNetwork({ ...mockParams, tokens });

			expect(mockAlchemyProvider.getNftsByOwner).toHaveBeenCalledExactlyOnceWith({
				address: mockWalletAddress,
				tokens: [erc1155NyanCatToken]
			});

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`Failed to load NFTs for tokens: ${erc1155NyanCatToken.address} on network: ${mockParams.networkId.toString()}.`,
				mockError
			);
		});
	});
});
