import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { NftError } from '$lib/types/errors';
import type { Nft, NftsByNetwork } from '$lib/types/nft';
import {
	findNft,
	getEnabledNfts,
	getNftCollectionUi,
	getNftsByNetworks,
	mapTokenToCollection,
	parseMetadataResourceUrl
} from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';

describe('nfts.utils', () => {
	const erc721Tokens: Erc721CustomToken[] = [
		{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true },
		{ ...DE_GODS_TOKEN, version: BigInt(1), enabled: true }
	];

	const mockNft1: Nft = {
		...mockValidErc721Nft,
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const mockNft2: Nft = {
		...mockValidErc721Nft,
		id: parseNftId(12632),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const mockNft3: Nft = {
		...mockValidErc721Nft,
		id: parseNftId(843764),
		collection: {
			...mockValidErc721Nft.collection,
			address: DE_GODS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftAzuki1 = {
		...mockValidErc721Nft,
		id: parseNftId(1),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'Azuki Elemental Beans',
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftAzuki2 = {
		...mockValidErc721Nft,
		id: parseNftId(2),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'Azuki Elemental Beans',
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftDeGods = {
		...mockValidErc721Nft,
		id: parseNftId(3),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'DeGods',
			address: DE_GODS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftOtherNetwork = {
		...mockValidErc721Nft,
		id: parseNftId(4),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'Azuki Elemental Beans',
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			// same address as AZUKI, but **different** network
			network: ETHEREUM_NETWORK
		}
	};

	describe('getNftsByNetworks', () => {
		it('should return nfts for a given list of tokens and networks', () => {
			const customErc721Tokens: Erc721CustomToken[] = [
				{
					...AZUKI_ELEMENTAL_BEANS_TOKEN,
					version: BigInt(1),
					enabled: true,
					network: ETHEREUM_NETWORK
				},
				{ ...DE_GODS_TOKEN, version: BigInt(1), enabled: true }
			];

			const customMockNft1: Nft = {
				...mockNft1,
				collection: { ...mockNft1.collection, network: ETHEREUM_NETWORK }
			};

			const customMockNft2: Nft = {
				...mockNft2,
				collection: { ...mockNft2.collection, network: ETHEREUM_NETWORK }
			};

			const result: NftsByNetwork = getNftsByNetworks({
				tokens: customErc721Tokens,
				nfts: [customMockNft1, customMockNft2, mockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[ETHEREUM_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [customMockNft1, customMockNft2]
				},
				[POLYGON_AMOY_NETWORK.id]: {
					[DE_GODS_TOKEN.address.toLowerCase()]: [mockNft3]
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return nfts for a given list of tokens', () => {
			const result: NftsByNetwork = getNftsByNetworks({
				tokens: erc721Tokens,
				nfts: [mockNft1, mockNft2, mockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [mockNft1, mockNft2],
					[DE_GODS_TOKEN.address.toLowerCase()]: [mockNft3]
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty lists for tokens that do not have matching nfts', () => {
			const customMockNft1: Nft = {
				...mockNft1,
				collection: { ...mockNft1.collection, address: mockEthAddress }
			};
			const customMockNft2: Nft = {
				...mockNft2,
				collection: { ...mockNft2.collection, address: mockEthAddress }
			};
			const customMockNft3: Nft = {
				...mockNft3,
				collection: { ...mockNft3.collection, address: mockEthAddress }
			};

			const result: NftsByNetwork = getNftsByNetworks({
				tokens: erc721Tokens,
				nfts: [customMockNft1, customMockNft2, customMockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [],
					[DE_GODS_TOKEN.address.toLowerCase()]: []
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return an empty map', () => {
			const result: NftsByNetwork = getNftsByNetworks({
				tokens: [],
				nfts: [mockNft1, mockNft2, mockNft3]
			});

			const expectedResult = {};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty lists for tokens for which no nfts were provided', () => {
			const result = getNftsByNetworks({ tokens: erc721Tokens, nfts: [] });

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [],
					[DE_GODS_TOKEN.address.toLowerCase()]: []
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return an empty map if no tokens and no nfts are provided', () => {
			const result = getNftsByNetworks({ tokens: [], nfts: [] });

			const expectedResult = {};

			expect(result).toEqual(expectedResult);
		});
	});

	describe('findNft', () => {
		it('should return existing nft', () => {
			const nfts = [mockNft1, mockNft2, mockNft3];

			const result = findNft({
				nfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				tokenId: parseNftId(12632)
			});

			expect(result).toEqual(mockNft2);
		});

		it('should return undefined if no nft is found', () => {
			const nfts = [mockNft1, mockNft2, mockNft3];

			const result = findNft({
				nfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				tokenId: parseNftId(837373)
			});

			expect(result).toBeUndefined();
		});
	});

	describe('parseMetadataResourceUrl', () => {
		const mockError = new NftError(123456, PEPE_TOKEN.address);

		it('should raise an error if URL is not a parseable URL', () => {
			const url = 'invalid-url';

			expect(() => parseMetadataResourceUrl({ url, error: mockError })).toThrow(mockError);
		});

		it('should return the same URL if not IPFS protocol', () => {
			const url = 'https://example.com/metadata.json';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result).toBeInstanceOf(URL);
			expect(result?.href).toBe(url);
		});

		it('should transform a valid ipfs:// URL to ipfs.io', () => {
			const url = 'ipfs://Qm12345abcde/metadata.json';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result).toBeInstanceOf(URL);
			expect(result?.href).toBe('https://ipfs.io/ipfs/Qm12345abcde/metadata.json');
		});

		it('should handle malformed IPFS path', () => {
			const url = 'ipfs://';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('https://ipfs.io/ipfs/');
		});

		it('should handle transformed IPFS URL with emojis', () => {
			const url = 'ipfs://??//💣';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('https://ipfs.io/ipfs/??//%F0%9F%92%A3');
		});

		it('should handle IPFS URL that is not valid per UrlSchema', () => {
			const url = 'ipfs:??//💣';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('ipfs:??//%F0%9F%92%A3');
		});

		it('should handle empty IPFS string', () => {
			const url = 'ipfs:// ';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('ipfs:/');
		});

		it('should not allow URL with localhost', () => {
			const url = 'http://localhost:3000/some-data';

			expect(() => parseMetadataResourceUrl({ url, error: mockError })).toThrow(mockError);
		});
	});

	describe('mapTokenToCollection', () => {
		it('should map token correctly', () => {
			const result = mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN);

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				name: AZUKI_ELEMENTAL_BEANS_TOKEN.name,
				symbol: AZUKI_ELEMENTAL_BEANS_TOKEN.symbol,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network,
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard
			});
		});

		it('should not map empty name and symbol', () => {
			const result = mapTokenToCollection({ ...AZUKI_ELEMENTAL_BEANS_TOKEN, name: '', symbol: '' });

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network,
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard
			});
		});
	});

	describe('getEnabledNfts', () => {
		it('returns only NFTs whose (address, network) exists in enabled tokens', () => {
			const enabledTokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];

			const res = getEnabledNfts({
				$nftStore: [nftAzuki1, nftAzuki2, nftDeGods, nftOtherNetwork],
				$enabledNonFungibleNetworkTokens: enabledTokens
			});

			// nftOtherNetwork should be filtered out (wrong network)
			expect(res).toEqual([nftAzuki1, nftAzuki2, nftDeGods]);
		});

		it('returns empty when $nftStore is undefined', () => {
			const enabledTokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];

			const res = getEnabledNfts({
				$nftStore: undefined,
				$enabledNonFungibleNetworkTokens: enabledTokens
			});

			expect(res).toEqual([]);
		});

		it('returns empty when no enabled tokens', () => {
			const res = getEnabledNfts({
				$nftStore: [nftAzuki1, nftAzuki2, nftDeGods],
				$enabledNonFungibleNetworkTokens: []
			});

			expect(res).toEqual([]);
		});

		it('matches by both address and network id (mismatch network is excluded)', () => {
			const enabledTokens = [
				// Only enable AZUKI on Polygon
				{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_AMOY_NETWORK }
			];

			const res = getEnabledNfts({
				$nftStore: [nftAzuki1, nftOtherNetwork],
				$enabledNonFungibleNetworkTokens: enabledTokens
			});

			expect(res).toEqual([nftAzuki1]);
		});
	});

	describe('getNftCollectionUi', () => {
		it('creates a UI entry for each token and groups matching NFTs', () => {
			const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];

			const res = getNftCollectionUi({
				$nonFungibleTokens: tokens,
				$nftStore: [nftAzuki1, nftAzuki2, nftDeGods, nftOtherNetwork]
			});

			// Two collections (one per token)
			expect(res).toHaveLength(2);

			const [azukiUi, deGodsUi] =
				res[0].collection.address === AZUKI_ELEMENTAL_BEANS_TOKEN.address ? res : [res[1], res[0]];

			// collection info matches mapTokenToCollection
			expect(azukiUi.collection).toEqual(mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN));
			expect(deGodsUi.collection).toEqual(mapTokenToCollection(DE_GODS_TOKEN));

			// nfts grouped by collection AND network (the ETH one must be excluded)
			expect(azukiUi.nfts).toEqual([nftAzuki1, nftAzuki2]);
			expect(deGodsUi.nfts).toEqual([nftDeGods]);
		});

		it('returns empty nfts arrays for tokens with no matching NFTs', () => {
			const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];

			const res = getNftCollectionUi({
				$nonFungibleTokens: tokens,
				$nftStore: []
			});

			expect(res).toHaveLength(2);
			expect(res[0].nfts).toEqual([]);
			expect(res[1].nfts).toEqual([]);
		});

		it('returns an empty array when no tokens are provided', () => {
			const res = getNftCollectionUi({
				$nonFungibleTokens: [],
				$nftStore: [nftAzuki1]
			});

			expect(res).toEqual([]);
		});
	});
});
