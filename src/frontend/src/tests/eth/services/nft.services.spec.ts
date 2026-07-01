import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
import {
	__test__only__clear_on_chain_image_url_cache__,
	loadNftsByNetwork
} from '$eth/services/nft.services';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL } from '$lib/constants/analytics.constants';
import { MediaStatusEnum } from '$lib/enums/media-status';
import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Nft } from '$lib/types/nft';
import { getMediaStatusOrCache } from '$lib/utils/nfts.utils';
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

vi.mock('$eth/providers/infura-erc721.providers', () => ({
	infuraErc721Providers: vi.fn()
}));

vi.mock('$eth/providers/infura-erc1155.providers', () => ({
	infuraErc1155Providers: vi.fn()
}));

vi.mock(import('$lib/utils/nfts.utils'), async (importOriginal) => ({
	...(await importOriginal()),
	getMediaStatusOrCache: vi.fn()
}));

vi.mock(import('$lib/services/analytics.services'), async (importOriginal) => ({
	...(await importOriginal()),
	trackEvent: vi.fn()
}));

describe('nft.services', () => {
	const mockAlchemyProvider = {
		network: new Network('ethereum', 1),
		provider: {},
		getNftsByOwner: vi.fn()
	} as unknown as AlchemyProvider;

	const mockInfuraErc721Provider = {
		getNftMetadata: vi.fn()
	} as unknown as ReturnType<typeof infuraErc721Providers>;

	const mockInfuraErc1155Provider = {
		getNftMetadata: vi.fn()
	} as unknown as ReturnType<typeof infuraErc1155Providers>;

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

		const mockErc721NftWithoutImage: Nft = {
			...mockNft1,
			imageUrl: undefined,
			mediaStatus: { image: MediaStatusEnum.INVALID_DATA, thumbnail: MediaStatusEnum.INVALID_DATA }
		};
		const mockErc1155NftWithoutImage: Nft = {
			...mockNft3,
			imageUrl: undefined,
			mediaStatus: { image: MediaStatusEnum.INVALID_DATA, thumbnail: MediaStatusEnum.INVALID_DATA }
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
			__test__only__clear_on_chain_image_url_cache__();

			vi.mocked(alchemyProviders).mockReturnValue(mockAlchemyProvider);
			vi.mocked(infuraErc721Providers).mockReturnValue(mockInfuraErc721Provider);
			vi.mocked(infuraErc1155Providers).mockReturnValue(mockInfuraErc1155Provider);
			vi.mocked(getMediaStatusOrCache).mockResolvedValue(MediaStatusEnum.OK);
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

		describe('on-chain media fallback', () => {
			it('resolves the image from the contract when Alchemy returns no media (ERC721)', async () => {
				vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([
					mockErc721NftWithoutImage
				]);
				vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockResolvedValueOnce({
					id: mockErc721NftWithoutImage.id,
					imageUrl: 'https://arweave.net/on-chain-image'
				});

				const result = await loadNftsByNetwork({
					...mockParams,
					tokens: [erc721AzukiToken],
					networkId: erc721AzukiToken.network.id
				});

				expect(mockInfuraErc721Provider.getNftMetadata).toHaveBeenCalledExactlyOnceWith({
					contractAddress: mockErc721NftWithoutImage.collection.address,
					tokenId: mockErc721NftWithoutImage.id
				});
				expect(result).toStrictEqual([
					{
						...mockErc721NftWithoutImage,
						imageUrl: 'https://arweave.net/on-chain-image',
						mediaStatus: {
							image: MediaStatusEnum.OK,
							thumbnail: MediaStatusEnum.INVALID_DATA
						}
					}
				]);
				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
						token_network: mockErc721NftWithoutImage.collection.network.name,
						token_address: mockErc721NftWithoutImage.collection.address,
						token_standard: mockErc721NftWithoutImage.collection.standard.code,
						token_symbol: mockErc721NftWithoutImage.collection.symbol,
						token_name: mockErc721NftWithoutImage.collection.name,
						token_id: `${mockErc721NftWithoutImage.id}`
					}
				});
			});

			it('resolves the image from the contract when Alchemy returns no media (ERC1155)', async () => {
				vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([
					mockErc1155NftWithoutImage
				]);
				vi.mocked(mockInfuraErc1155Provider.getNftMetadata).mockResolvedValueOnce({
					id: mockErc1155NftWithoutImage.id,
					imageUrl: 'https://arweave.net/on-chain-1155'
				});

				const result = await loadNftsByNetwork({
					...mockParams,
					tokens: [erc1155NyanCatToken],
					networkId: erc1155NyanCatToken.network.id
				});

				expect(mockInfuraErc1155Provider.getNftMetadata).toHaveBeenCalledExactlyOnceWith({
					contractAddress: mockErc1155NftWithoutImage.collection.address,
					tokenId: mockErc1155NftWithoutImage.id
				});
				expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalled();
				expect(result[0].imageUrl).toBe('https://arweave.net/on-chain-1155');
			});

			it('does not query the contract when Alchemy already returns media', async () => {
				vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft1]);

				const result = await loadNftsByNetwork({
					...mockParams,
					tokens: [erc721AzukiToken],
					networkId: erc721AzukiToken.network.id
				});

				expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalled();
				expect(result).toStrictEqual([mockNft1]);
				expect(trackEvent).not.toHaveBeenCalled();
			});

			it('leaves the NFT without media when the contract has none either', async () => {
				vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([
					mockErc721NftWithoutImage
				]);
				vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockResolvedValueOnce({
					id: mockErc721NftWithoutImage.id
				});

				const result = await loadNftsByNetwork({
					...mockParams,
					tokens: [erc721AzukiToken],
					networkId: erc721AzukiToken.network.id
				});

				expect(result).toStrictEqual([mockErc721NftWithoutImage]);
				expect(getMediaStatusOrCache).not.toHaveBeenCalled();
				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						token_network: mockErc721NftWithoutImage.collection.network.name,
						token_address: mockErc721NftWithoutImage.collection.address,
						token_standard: mockErc721NftWithoutImage.collection.standard.code,
						token_symbol: mockErc721NftWithoutImage.collection.symbol,
						token_name: mockErc721NftWithoutImage.collection.name,
						token_id: `${mockErc721NftWithoutImage.id}`
					}
				});
			});

			it('keeps the NFT and warns when the contract lookup fails', async () => {
				const mockError = new Error('tokenURI failed');

				vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([
					mockErc721NftWithoutImage
				]);
				vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockRejectedValueOnce(mockError);

				const result = await loadNftsByNetwork({
					...mockParams,
					tokens: [erc721AzukiToken],
					networkId: erc721AzukiToken.network.id
				});

				expect(result).toStrictEqual([mockErc721NftWithoutImage]);
				expect(console.warn).toHaveBeenCalledExactlyOnceWith(
					`Failed to resolve on-chain media for NFT ${mockErc721NftWithoutImage.id} of token: ${mockErc721NftWithoutImage.collection.address} on network: ${erc721AzukiToken.network.id.toString()}.`,
					mockError
				);
				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_NFT_LOAD_ONCHAIN_IMAGE_URL,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						token_network: mockErc721NftWithoutImage.collection.network.name,
						token_address: mockErc721NftWithoutImage.collection.address,
						token_standard: mockErc721NftWithoutImage.collection.standard.code,
						token_symbol: mockErc721NftWithoutImage.collection.symbol,
						token_name: mockErc721NftWithoutImage.collection.name,
						token_id: `${mockErc721NftWithoutImage.id}`
					}
				});
			});

			it('resolves on-chain media only once across repeated polls', async () => {
				vi.mocked(mockAlchemyProvider.getNftsByOwner)
					.mockResolvedValueOnce([mockErc721NftWithoutImage])
					.mockResolvedValueOnce([mockErc721NftWithoutImage]);
				vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockResolvedValueOnce({
					id: mockErc721NftWithoutImage.id,
					imageUrl: 'https://arweave.net/on-chain-image'
				});

				const params = {
					...mockParams,
					tokens: [erc721AzukiToken],
					networkId: erc721AzukiToken.network.id
				};

				const first = await loadNftsByNetwork(params);
				const second = await loadNftsByNetwork(params);

				// On-chain resolution and the event happen once; the second poll reuses the cache.
				expect(mockInfuraErc721Provider.getNftMetadata).toHaveBeenCalledOnce();
				expect(trackEvent).toHaveBeenCalledOnce();
				expect(first[0].imageUrl).toBe('https://arweave.net/on-chain-image');
				expect(second[0].imageUrl).toBe('https://arweave.net/on-chain-image');
			});
		});
	});
});
