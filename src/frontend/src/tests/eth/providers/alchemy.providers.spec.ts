import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { AlchemyProvider, alchemyProviders } from '$eth/providers/alchemy.providers';
import type {
	AlchemyProviderContract,
	AlchemyProviderContracts
} from '$eth/types/alchemy-contract';
import type { Erc1155Metadata } from '$eth/types/erc1155';
import type { EthereumNetwork } from '$eth/types/network';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { Nft, OwnedContract } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import {
	Alchemy,
	NftSpamClassification,
	NftTokenType,
	type Nft as AlchemyNft,
	type OwnedNftsResponse
} from 'alchemy-sdk';
import { SvelteMap } from 'svelte/reactivity';

vi.mock(import('alchemy-sdk'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		Alchemy: vi.fn()
	};
});

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

describe('alchemy.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		expect(Alchemy).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { alchemy: _, alchemyDeprecated } }, index) => {
			expect(Alchemy).toHaveBeenNthCalledWith(index + 1, {
				apiKey: ALCHEMY_API_KEY,
				network: alchemyDeprecated
			});
		});
	});

	describe('getNftsByOwner', () => {
		const mockApiResponse: OwnedNftsResponse = {
			totalCount: 4,
			validAt: { blockHash: '0x123' },
			ownedNfts: [
				{
					tokenId: '1',
					name: 'Name1',
					image: { originalUrl: 'https://download.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '1',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: NftTokenType.ERC1155,
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' },
						spamClassifications: [NftSpamClassification.Unknown]
					},
					tokenType: NftTokenType.ERC1155,
					timeLastUpdated: '456_123'
				},
				{
					tokenId: '2',
					name: 'Name2',
					image: { originalUrl: 'https://download2.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: NftTokenType.ERC1155,
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' },
						spamClassifications: [NftSpamClassification.Unknown]
					},
					tokenType: NftTokenType.ERC1155,
					timeLastUpdated: '456_123'
				},
				{
					tokenId: '3',
					name: 'Name3',
					image: { originalUrl: 'https://download3.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: NftTokenType.ERC1155,
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' },
						spamClassifications: [NftSpamClassification.Unknown]
					},
					tokenType: NftTokenType.ERC1155,
					timeLastUpdated: '456_123'
				},
				{
					tokenId: '4',
					name: 'Name4',
					image: { originalUrl: 'https://download4.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {
						address: mockValidErc1155Token.address,
						tokenType: NftTokenType.ERC1155,
						openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' },
						spamClassifications: [NftSpamClassification.Unknown]
					},
					tokenType: NftTokenType.ERC1155,
					timeLastUpdated: '456_123'
				}
			]
		};

		const expectedTokenIds: Nft[] = [
			{
				id: parseNftId('1'),
				name: 'Name1',
				imageUrl: 'https://download.com',
				balance: 1,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: NftMediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: NftMediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE
			},
			{
				id: parseNftId('2'),
				name: 'Name2',
				imageUrl: 'https://download2.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: NftMediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: NftMediaStatusEnum.OK
			},
			{
				id: parseNftId('3'),
				name: 'Name3',
				imageUrl: 'https://download3.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: NftMediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED
			},
			{
				id: parseNftId('4'),
				name: 'Name4',
				imageUrl: 'https://download4.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token),
					bannerImageUrl: 'https://download.com',
					bannerMediaStatus: NftMediaStatusEnum.OK
				},
				description: 'lorem ipsum',
				mediaStatus: NftMediaStatusEnum.OK
			}
		];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'something' : h === 'Content-Length' ? '5000' : null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: () => null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? '1000000000' : null
					}
				})
				.mockResolvedValueOnce({
					headers: {
						get: (h: string) =>
							h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? '5000' : null
					}
				});
		});

		it('should fetch and map nfts correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				tokens: [mockValidErc1155Token]
			});

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();
			expect(nfts).toStrictEqual(expectedTokenIds);
		});

		it('should only map existing data', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockResolvedValue({
						ownedNfts: [
							{
								tokenId: '1',
								raw: { metadata: {} },
								contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
							},
							{
								tokenId: '2',
								raw: { metadata: {} },
								contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
							}
						]
					})
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				tokens: [mockValidErc1155Token]
			});

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();

			expect(nfts).toStrictEqual([
				{
					id: parseNftId('1'),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					},
					mediaStatus: NftMediaStatusEnum.INVALID_DATA
				},
				{
					id: parseNftId('2'),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					},
					mediaStatus: NftMediaStatusEnum.INVALID_DATA
				}
			]);
		});

		it('should throw an error', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockRejectedValueOnce(new Error('Nfts Error'))
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(
				provider.getNftsByOwner({ address: mockEthAddress, tokens: [mockValidErc1155Token] })
			).rejects.toThrow('Nfts Error');

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();
		});
	});

	describe('getNftMetadata', () => {
		const mockApiResponse: AlchemyNft = {
			tokenId: '1',
			name: 'Name1',
			image: { originalUrl: 'https://download1.com' },
			description: 'lorem ipsum',
			raw: { metadata: {} },
			contract: {
				address: mockValidErc1155Token.address,
				tokenType: NftTokenType.ERC1155,
				openSeaMetadata: { bannerImageUrl: 'https://download.com', lastIngestedAt: '123_456' },
				spamClassifications: [NftSpamClassification.Unknown]
			},
			tokenType: NftTokenType.ERC1155,
			timeLastUpdated: '456_123'
		};

		const mockTokenId = parseNftId('1');

		const expectedNft: Nft = {
			id: mockTokenId,
			name: 'Name1',
			imageUrl: 'https://download1.com',
			collection: {
				...mapTokenToCollection(mockValidErc1155Token),
				bannerImageUrl: 'https://download.com',
				bannerMediaStatus: NftMediaStatusEnum.OK
			},
			description: 'lorem ipsum',
			mediaStatus: NftMediaStatusEnum.OK
		};

		beforeEach(() => {
			vi.clearAllMocks();
			global.fetch = vi.fn().mockResolvedValue({
				headers: {
					get: () => null
				}
			});
		});

		it('should fetch and map NFT correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftMetadata: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nft = await provider.getNftMetadata({
				token: mockValidErc1155Token,
				tokenId: mockTokenId
			});

			expect(Alchemy.prototype.nft.getNftMetadata).toHaveBeenCalledOnce();
			expect(nft).toStrictEqual(expectedNft);
		});

		it('should only map existing data', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftMetadata: vi.fn().mockResolvedValue({
						tokenId: '1',
						raw: { metadata: {} },
						contract: { address: mockValidErc1155Token.address, tokenType: 'Erc1155' }
					})
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nft = await provider.getNftMetadata({
				token: mockValidErc1155Token,
				tokenId: mockTokenId
			});

			expect(Alchemy.prototype.nft.getNftMetadata).toHaveBeenCalledOnce();

			expect(nft).toStrictEqual({
				id: parseNftId('1'),
				collection: {
					...mapTokenToCollection(mockValidErc1155Token)
				},
				mediaStatus: NftMediaStatusEnum.INVALID_DATA
			});
		});

		it('should throw an error', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftMetadata: vi.fn().mockRejectedValueOnce(new Error('Nfts Error'))
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(
				provider.getNftMetadata({ token: mockValidErc1155Token, tokenId: mockTokenId })
			).rejects.toThrow('Nfts Error');

			expect(Alchemy.prototype.nft.getNftMetadata).toHaveBeenCalledOnce();
		});
	});

	describe('getTokensForOwner', () => {
		const mockApiResponse: AlchemyProviderContracts = {
			contracts: [
				{
					isSpam: false,
					address: mockEthAddress,
					tokenType: 'ERC721'
				},
				{
					isSpam: false,
					address: mockEthAddress2,
					tokenType: 'ERC721'
				}
			]
		};

		const expectedContracts: OwnedContract[] = [
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress2, isSpam: false, standard: 'erc721' }
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch and map contracts correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractsForOwner: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(Alchemy.prototype.nft.getContractsForOwner).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});

		it('should handle incorrect token types correctly', async () => {
			const updatedMockApiResponse = {
				...mockApiResponse,
				...[
					{
						isSpam: false,
						address: mockEthAddress,
						tokenType: 'NO_SUPPORTED_NFT_STANDARD'
					}
				]
			};

			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractsForOwner: vi.fn().mockResolvedValue(updatedMockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(Alchemy.prototype.nft.getContractsForOwner).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});
	});

	describe('getContractMetadata', () => {
		const mockApiResponse: AlchemyProviderContract = {
			name: 'MyContract',
			symbol: 'MC',
			tokenType: 'ERC721',
			openSeaMetadata: {
				description: 'This is a description',
				collectionName: 'My mega contract'
			}
		};

		const expectedMetadata: Erc1155Metadata = {
			name: 'My mega contract',
			symbol: 'MC',
			decimals: 0,
			description: 'This is a description'
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch and map contract metadata correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractMetadata: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const metadata = await provider.getContractMetadata(mockEthAddress);

			expect(Alchemy.prototype.nft.getContractMetadata).toHaveBeenCalledOnce();

			expect(metadata).toStrictEqual(expectedMetadata);
		});

		it('should handle incorrect token type correctly', async () => {
			const updatedMockApiResponse = {
				...mockApiResponse,
				tokenType: 'NO_SUPPORTED_NFT_STANDARD'
			};

			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractMetadata: vi.fn().mockResolvedValue(updatedMockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(provider.getContractMetadata(mockEthAddress)).rejects.toThrow(
				'Invalid token standard'
			);

			expect(Alchemy.prototype.nft.getContractMetadata).toHaveBeenCalledOnce();
		});
	});

	describe('alchemyProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = alchemyProviders(id);

				expect(provider).toBeInstanceOf(AlchemyProvider);

				expect(provider).toHaveProperty('deprecatedProvider');
				expect(provider).not.toHaveProperty('provider');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => alchemyProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_alchemy_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
