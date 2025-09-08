import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { NftError } from '$lib/types/errors';
import type { Nft, NftId, NftsByNetwork, NonFungibleToken } from '$lib/types/nft';
import {
	filterSortByCollection,
	findNewNftIds,
	findNft,
	findNonFungibleToken,
	findRemovedNfts,
	getAllowMediaForNft,
	getEnabledNfts,
	getNftCollectionUi,
	getNftsByNetworks,
	getUpdatedNfts,
	mapTokenToCollection,
	parseMetadataResourceUrl
} from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';

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

	// Same collator settings as in the impl
	const collator = new Intl.Collator(new Intl.Locale(navigator.language), {
		sensitivity: 'base',
		numeric: true
	});

	// Build a case-insensitive substring from the Azuki name for filtering
	const azukiName = mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN).name ?? '';
	const deGodsName = mapTokenToCollection(DE_GODS_TOKEN).name ?? '';

	const filterSub =
		azukiName && azukiName.length >= 3
			? azukiName.slice(1, 4).toLowerCase()
			: azukiName.toLowerCase();

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

	describe('findNewNftIds', () => {
		it('should return new nft ids', () => {
			const loadedNfts = [mockNft1, mockNft3];
			const inventory = [mockNft1.id, mockNft2.id];

			const result = findNewNftIds({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([mockNft2.id]);
		});

		it('should return empty array if no new nft ids exist', () => {
			const loadedNfts = [mockNft1, mockNft3];
			const inventory = [mockNft1.id];

			const result = findNewNftIds({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});

		it('should return empty array if inventory is empty', () => {
			const loadedNfts = [mockNft1, mockNft3];
			const inventory: NftId[] = [];

			const result = findNewNftIds({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});
	});

	describe('findRemovedNfts', () => {
		it('should return removed nfts', () => {
			const loadedNfts = [mockNft1, mockNft2];
			const inventory = [mockNft2.id];

			const result = findRemovedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([mockNft1]);
		});

		it('should handle different tokens and networks correctly', () => {
			const loadedNfts = [mockNft1, mockNft2, mockNft3];
			const inventory: NftId[] = [];

			const result = findRemovedNfts({ nfts: loadedNfts, token: DE_GODS_TOKEN, inventory });

			expect(result).toEqual([mockNft3]);
		});

		it('should return empty array if not nfts were removed', () => {
			const loadedNfts = [mockNft1, mockNft2];
			const inventory = [mockNft1.id, mockNft2.id];

			const result = findRemovedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});

		it('should return empty array if not nfts are loaded yet', () => {
			const loadedNfts: Nft[] = [];
			const inventory = [mockNft1.id, mockNft2.id];

			const result = findRemovedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});
	});

	describe('getUpdatedNfts', () => {
		const mockErc1155Nft1 = {
			...mockValidErc1155Nft,
			id: parseNftId(983524),
			balance: 2,
			collection: {
				...mockValidErc1155Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: POLYGON_AMOY_NETWORK
			}
		};
		const mockErc1155Nft2 = {
			...mockValidErc1155Nft,
			id: parseNftId(37534),
			balance: 3,
			collection: {
				...mockValidErc1155Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: POLYGON_AMOY_NETWORK
			}
		};
		const mockErc1155Nft3 = {
			...mockValidErc1155Nft,
			id: parseNftId(823746),
			balance: 3,
			collection: {
				...mockValidErc1155Nft.collection,
				address: DE_GODS_TOKEN.address,
				network: POLYGON_AMOY_NETWORK
			}
		};

		it('should return nfts with updated balances', () => {
			const loadedNfts = [mockErc1155Nft1, mockErc1155Nft2];
			const inventory: Nft[] = [
				{ ...mockErc1155Nft1, balance: 5 },
				{ ...mockErc1155Nft2, balance: mockErc1155Nft2.balance }
			];

			const result = getUpdatedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([{ ...mockErc1155Nft1, balance: 5 }]);
		});

		it('should return empty array if no balances have changed', () => {
			const loadedNfts = [mockErc1155Nft1, mockErc1155Nft2];
			const inventory: Nft[] = [
				{ ...mockErc1155Nft1, balance: mockErc1155Nft1.balance },
				{ ...mockErc1155Nft2, balance: mockErc1155Nft2.balance }
			];

			const result = getUpdatedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});

		it('should return empty array if no nfts are loaded yet', () => {
			const loadedNfts: Nft[] = [];
			const inventory: Nft[] = [
				{ ...mockErc1155Nft1, balance: mockErc1155Nft1.balance },
				{ ...mockErc1155Nft2, balance: mockErc1155Nft2.balance }
			];

			const result = getUpdatedNfts({
				nfts: loadedNfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				inventory
			});

			expect(result).toEqual([]);
		});

		it('should handle different tokens and networks correctly', () => {
			const loadedNfts = [mockErc1155Nft1, mockErc1155Nft2, mockErc1155Nft3];
			const inventory: Nft[] = [
				{ ...mockErc1155Nft1, balance: 5 },
				{ ...mockErc1155Nft2, balance: 5 },
				{ ...mockErc1155Nft3, balance: 5 }
			];

			const result = getUpdatedNfts({ nfts: loadedNfts, token: DE_GODS_TOKEN, inventory });

			expect(result).toEqual([{ ...mockErc1155Nft3, balance: 5 }]);
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

	describe('filterSortByCollection', () => {
		const base = [
			// Purposely shuffled order to make sorting assertions meaningful
			nftDeGods, // "DeGods"
			nftAzuki2, // "Azuki Elemental Beans"
			nftAzuki1 // "Azuki Elemental Beans"
		];

		const collections = (() => {
			const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];
			const ui = getNftCollectionUi({
				$nonFungibleTokens: tokens,
				$nftStore: [nftAzuki1, nftAzuki2, nftDeGods]
			});
			// Shuffle to make sorting meaningful
			return [ui[1], ui[0]];
		})();

		it('filters by collection name (case-insensitive substring)', () => {
			const res = filterSortByCollection({
				items: base,
				filter: 'azu' // lowercase
			});

			expect(res).toEqual([nftAzuki2, nftAzuki1]);
		});

		it('sorts by collection name ascending', () => {
			const res = filterSortByCollection({
				items: base,
				sort: { type: 'collection-name', order: 'asc' }
			});

			// "Azuki..." then "DeGods"
			expect(res.map((n) => n.collection.name)).toEqual([
				'Azuki Elemental Beans',
				'Azuki Elemental Beans',
				'DeGods'
			]);
		});

		it('sorts by collection name descending', () => {
			const res = filterSortByCollection({
				items: base,
				sort: { type: 'collection-name', order: 'desc' }
			});

			// "DeGods" then "Azuki..."
			expect(res.map((n) => n.collection.name)).toEqual([
				'DeGods',
				'Azuki Elemental Beans',
				'Azuki Elemental Beans'
			]);
		});

		it('applies filter then sort', () => {
			const res = filterSortByCollection({
				items: base,
				filter: 'god',
				sort: { type: 'collection-name', order: 'asc' }
			});

			// Only DeGods remains; sorted trivially
			expect(res).toEqual([nftDeGods]);
		});

		it('returns the same reference when neither filter nor sort is provided', () => {
			const input = [...base];
			const res = filterSortByCollection({ items: input });

			expect(res).toBe(input);
		});

		it('returns a new array when sort is provided (immutability)', () => {
			const input = [...base];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).not.toBe(input);
		});

		it('filters collections by collection.name (case-insensitive substring)', () => {
			const res = filterSortByCollection({
				items: collections,
				filter: filterSub
			});

			expect(res).toHaveLength(1);
			expect(res[0].collection.address).toBe(AZUKI_ELEMENTAL_BEANS_TOKEN.address);
		});

		it('sorts collections by name ascending', () => {
			const res = filterSortByCollection({
				items: collections,
				sort: { type: 'collection-name', order: 'asc' }
			});

			const expectedOrder = [azukiName, deGodsName].sort((a, b) =>
				collator.compare(a ?? '', b ?? '')
			);

			expect(res.map((c) => c.collection.name ?? '')).toEqual(expectedOrder);
		});

		it('sorts collections by name descending', () => {
			const res = filterSortByCollection({
				items: collections,
				sort: { type: 'collection-name', order: 'desc' }
			});

			const expectedOrder = [azukiName, deGodsName]
				.sort((a, b) => collator.compare(a ?? '', b ?? ''))
				.reverse();

			expect(res.map((c) => c.collection.name ?? '')).toEqual(expectedOrder);
		});

		it('applies filter for collection then sort', () => {
			const res = filterSortByCollection({
				items: collections,
				filter: 'god',
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).toHaveLength(1);
			expect(res[0].collection.address).toBe(DE_GODS_TOKEN.address);
		});

		it('returns the same reference when neither filter nor sort is provided for collections', () => {
			const input = [...collections];
			const res = filterSortByCollection({ items: input });

			expect(res).toBe(input);
		});

		it('returns a new array when sort is provided for collections (immutability)', () => {
			const input = [...collections];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).not.toBe(input);
		});
	});

	describe('findNonFungibleToken', () => {
		const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN];

		it('should return the found token', () => {
			const result = findNonFungibleToken({
				tokens,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				networkId: AZUKI_ELEMENTAL_BEANS_TOKEN.network.id
			});

			expect(result).toEqual(AZUKI_ELEMENTAL_BEANS_TOKEN);
		});

		it('should return undefined if no token was found', () => {
			const result = findNonFungibleToken({
				tokens,
				address: mockEthAddress,
				networkId: ETHEREUM_NETWORK.id
			});

			expect(result).toBeUndefined();
		});
	});

	describe('getAllowMediaForNft', () => {
		const tokens = [
			{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, allowExternalContentSource: false },
			{ ...DE_GODS_TOKEN, allowExternalContentSource: false }
		] as Erc721CustomToken[];

		it('should correctly return the allow media prop for an nft contract address', () => {
			const params = {
				tokens,
				networkId: AZUKI_ELEMENTAL_BEANS_TOKEN.network.id,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address
			};
			const expected: NonFungibleToken | undefined = findNonFungibleToken(params);

			assertNonNullish(expected);

			const result = getAllowMediaForNft(params);

			expect(result).toEqual(expected?.allowExternalContentSource);
		});

		it('should fallback to undefined if the nft cant be found or the consent has never been set', () => {
			const params = { tokens, networkId: ETHEREUM_NETWORK.id, address: 'invalid address' };
			const result = getAllowMediaForNft(params);

			expect(result).toBeUndefined();
		});
	});
});
