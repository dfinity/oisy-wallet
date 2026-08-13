import {
	POLYGON_AMOY_NETWORK,
	POLYGON_AMOY_NETWORK_ID,
	POLYGON_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { NFT_MAX_FILESIZE_LIMIT } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { MediaStatusEnum } from '$lib/enums/media-status';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { NetworkSchema } from '$lib/schema/network.schema';
import { NftError } from '$lib/types/errors';
import type { Nft } from '$lib/types/nft';
import {
	filterSortByCollection,
	findNft,
	findNftsByNetwork,
	findNftsByToken,
	findNonFungibleToken,
	getEnabledNfts,
	getMediaStatus,
	getMediaStatusOrCache,
	getNftCollectionUi,
	getNftCountsByNetwork,
	getNftSendCloseRedirectUrl,
	getNftSendRedirectUrl,
	mapTokenToCollection,
	parseMetadataResourceUrl
} from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';

describe('nfts.utils', () => {
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
		id: parseNftId('12632'),
		collection: {
			...mockValidErc721Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const mockNft3: Nft = {
		...mockValidErc721Nft,
		id: parseNftId('843764'),
		collection: {
			...mockValidErc721Nft.collection,
			address: DE_GODS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftAzuki1 = {
		...mockValidErc721Nft,
		id: parseNftId('1'),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'Azuki Elemental Beans',
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftAzuki2 = {
		...mockValidErc721Nft,
		id: parseNftId('2'),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'Azuki Elemental Beans',
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftDeGods = {
		...mockValidErc721Nft,
		id: parseNftId('3'),
		collection: {
			...mockValidErc721Nft.collection,
			name: 'DeGods',
			address: DE_GODS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const nftOtherNetwork = {
		...mockValidErc721Nft,
		id: parseNftId('4'),
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

	describe('findNft', () => {
		it('should return existing nft', () => {
			const nfts = [mockNft1, mockNft2, mockNft3];

			const result = findNft({
				nfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				tokenId: parseNftId('12632')
			});

			expect(result).toEqual(mockNft2);
		});

		it('should return undefined if no nft is found', () => {
			const nfts = [mockNft1, mockNft2, mockNft3];

			const result = findNft({
				nfts,
				token: AZUKI_ELEMENTAL_BEANS_TOKEN,
				tokenId: parseNftId('837373')
			});

			expect(result).toBeUndefined();
		});
	});

	describe('findNftsByToken', () => {
		it('should return an empty array if no nfts were found', () => {
			const nfts: Nft[] = findNftsByToken({
				nfts: [mockNft1, mockNft2, mockNft3],
				token: NYAN_CAT_TOKEN
			});

			expect(nfts).toHaveLength(0);
		});

		it('should return an empty array if no nfts were provided', () => {
			const nfts: Nft[] = findNftsByToken({
				nfts: [],
				token: NYAN_CAT_TOKEN
			});

			expect(nfts).toHaveLength(0);
		});

		it('should return the nfts of the given token', () => {
			const nfts: Nft[] = findNftsByToken({
				nfts: [mockNft1, mockNft2, mockNft3],
				token: AZUKI_ELEMENTAL_BEANS_TOKEN
			});

			expect(nfts).toEqual([mockNft1, mockNft2]);
		});

		it('should return the nfts of the given token with different case', () => {
			const nfts: Nft[] = findNftsByToken({
				nfts: [mockNft1, mockNft2, mockNft3],
				token: {
					...AZUKI_ELEMENTAL_BEANS_TOKEN,
					address: AZUKI_ELEMENTAL_BEANS_TOKEN.address.toUpperCase()
				}
			});

			expect(nfts).toEqual([mockNft1, mockNft2]);
		});
	});

	describe('findNftsByNetwork', () => {
		it('should return an empty array if no nfts were found', () => {
			const nfts: Nft[] = findNftsByNetwork({
				nfts: [mockNft1, mockNft2, mockNft3],
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(nfts).toHaveLength(0);
		});

		it('should return an empty array if no nfts were provided', () => {
			const nfts: Nft[] = findNftsByNetwork({
				nfts: [],
				networkId: POLYGON_AMOY_NETWORK_ID
			});

			expect(nfts).toHaveLength(0);
		});

		it('should return the nfts of the given network', () => {
			const nfts: Nft[] = findNftsByNetwork({
				nfts: [mockNft1, mockNft2, mockNft3],
				networkId: POLYGON_AMOY_NETWORK_ID
			});

			expect(nfts).toEqual([mockNft1, mockNft2, mockNft3]);
		});

		it('should return all non-testnet-nfts if networkId is nullish', () => {
			const mockMainnetNft = {
				...mockNft3,
				collection: { ...mockNft3.collection, network: POLYGON_MAINNET_NETWORK }
			};

			const nfts: Nft[] = findNftsByNetwork({
				nfts: [mockNft1, mockNft2, mockMainnetNft],
				networkId: null
			});

			expect(nfts).toEqual([mockMainnetNft]);
		});
	});

	describe('getNftSendRedirectUrl', () => {
		it('returns the collection URL when other NFTs remain in the same collection', () => {
			const result = getNftSendRedirectUrl({
				sentNft: mockNft1,
				collectionNfts: [mockNft1, mockNft2]
			});

			expect(result).toBe(
				`${AppPath.Nfts}?collection=${mockNft1.collection.address}&network=${mockNft1.collection.network.id.description}`
			);
		});

		it('returns the NFTs root URL when the sent NFT was the last in its collection', () => {
			const result = getNftSendRedirectUrl({
				sentNft: mockNft1,
				collectionNfts: [mockNft1]
			});

			expect(result).toBe(AppPath.Nfts);
		});

		it('returns the NFTs root URL when the sent NFT is already absent from an empty collection list', () => {
			const result = getNftSendRedirectUrl({
				sentNft: mockNft1,
				collectionNfts: []
			});

			expect(result).toBe(AppPath.Nfts);
		});

		it('returns the collection URL when the sent NFT was already removed but siblings remain', () => {
			const result = getNftSendRedirectUrl({
				sentNft: mockNft1,
				collectionNfts: [mockNft2]
			});

			expect(result).toBe(
				`${AppPath.Nfts}?collection=${mockNft1.collection.address}&network=${mockNft1.collection.network.id.description}`
			);
		});
	});

	describe('getNftSendCloseRedirectUrl', () => {
		const sentNft = mockValidErc721Nft;
		const remainingNft = { ...mockValidErc721Nft, id: parseNftId('173564') };

		const detailSendDone = {
			isNftsPage: true,
			routeNft: sentNft.id,
			sendProgressStep: ProgressStepsSend.DONE,
			selectedNft: sentNft
		};

		it('returns the collection URL after a completed NFT detail-page send with siblings left', () => {
			expect(
				getNftSendCloseRedirectUrl({
					...detailSendDone,
					collectionNfts: [sentNft, remainingNft]
				})
			).toBe(
				`${AppPath.Nfts}?collection=${sentNft.collection.address}&network=${sentNft.collection.network.id.description}`
			);
		});

		it('returns the NFT root URL after a completed NFT detail-page send of the last item', () => {
			expect(
				getNftSendCloseRedirectUrl({
					...detailSendDone,
					collectionNfts: [sentNft]
				})
			).toBe(AppPath.Nfts);
		});

		it.each([
			{ description: 'is not on the NFTs page', override: { isNftsPage: false } },
			{ description: 'has no NFT route parameter', override: { routeNft: undefined } },
			{ description: 'has an empty NFT route parameter', override: { routeNft: '' } },
			{
				description: 'has not completed the send',
				override: { sendProgressStep: ProgressStepsSend.INITIALIZATION }
			},
			{ description: 'has no selected NFT', override: { selectedNft: undefined } }
		])('returns undefined when the modal $description', ({ override }) => {
			expect(
				getNftSendCloseRedirectUrl({
					...detailSendDone,
					...override,
					collectionNfts: [sentNft, remainingNft]
				})
			).toBeUndefined();
		});
	});

	describe('parseMetadataResourceUrl', () => {
		const mockError = new NftError('123456', PEPE_TOKEN.address);

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

			expect(result?.href).toBe('https://ipfs.io/ipfs/');
		});

		it('should not allow URL with localhost', () => {
			const url = 'http://localhost:3000/some-data';

			expect(() => parseMetadataResourceUrl({ url, error: mockError })).toThrow(mockError);
		});
	});

	describe('mapTokenToCollection', () => {
		it('should map ERC721 token correctly', () => {
			const result = mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN);

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				name: AZUKI_ELEMENTAL_BEANS_TOKEN.name,
				symbol: AZUKI_ELEMENTAL_BEANS_TOKEN.symbol,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				network: NetworkSchema.parse(AZUKI_ELEMENTAL_BEANS_TOKEN.network),
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard,
				description: AZUKI_ELEMENTAL_BEANS_TOKEN.description
			});
		});

		it('should map EXT token correctly', () => {
			const result = mapTokenToCollection(mockValidExtV2Token);

			expect(result).toEqual({
				address: mockValidExtV2Token.canisterId,
				name: mockValidExtV2Token.name,
				symbol: mockValidExtV2Token.symbol,
				id: mockValidExtV2Token.id,
				network: NetworkSchema.parse(mockValidExtV2Token.network),
				standard: mockValidExtV2Token.standard,
				description: mockValidExtV2Token.description
			});
		});

		it('should not map empty name, symbol and description', () => {
			const result = mapTokenToCollection({
				...AZUKI_ELEMENTAL_BEANS_TOKEN,
				name: '',
				symbol: '',
				description: ''
			});

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				network: NetworkSchema.parse(AZUKI_ELEMENTAL_BEANS_TOKEN.network),
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard
			});
		});

		it('should map token section correctly', () => {
			const result = mapTokenToCollection({
				...AZUKI_ELEMENTAL_BEANS_TOKEN,
				section: CustomTokenSection.HIDDEN
			});

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				description: AZUKI_ELEMENTAL_BEANS_TOKEN.description,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				name: AZUKI_ELEMENTAL_BEANS_TOKEN.name,
				network: NetworkSchema.parse(AZUKI_ELEMENTAL_BEANS_TOKEN.network),
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard,
				section: CustomTokenSection.HIDDEN,
				symbol: AZUKI_ELEMENTAL_BEANS_TOKEN.symbol
			});
		});

		it('should have undefined section if not set', () => {
			const result = mapTokenToCollection({
				...AZUKI_ELEMENTAL_BEANS_TOKEN
			});

			expect(result).toEqual({
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				description: AZUKI_ELEMENTAL_BEANS_TOKEN.description,
				id: AZUKI_ELEMENTAL_BEANS_TOKEN.id,
				name: AZUKI_ELEMENTAL_BEANS_TOKEN.name,
				network: NetworkSchema.parse(AZUKI_ELEMENTAL_BEANS_TOKEN.network),
				standard: AZUKI_ELEMENTAL_BEANS_TOKEN.standard,
				section: undefined,
				symbol: AZUKI_ELEMENTAL_BEANS_TOKEN.symbol
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
			expect(azukiUi.collection).toEqual({
				...mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN),
				newestAcquiredAt: new Date(0)
			});
			expect({ ...azukiUi.collection, newestAcquiredAt: new Date(0) }).toEqual({
				...mapTokenToCollection(AZUKI_ELEMENTAL_BEANS_TOKEN),
				newestAcquiredAt: new Date(0)
			});

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

		it('filters NFTs by collection.name (case-insensitive substring)', () => {
			const res = filterSortByCollection({
				items: base,
				filter: 'azu' // lowercase substring
			});

			expect(res).toEqual([nftAzuki2, nftAzuki1]);
		});

		it('filters NFTs by nft.name', () => {
			const custom = { ...nftAzuki1, name: 'Super Special NFT' };
			const res = filterSortByCollection({
				items: [custom, nftDeGods],
				filter: 'special'
			});

			expect(res).toEqual([custom]);
		});

		it('filters NFTs by nft.id', () => {
			const custom = { ...nftAzuki1, id: parseNftId('987654321') };
			const res = filterSortByCollection({
				items: [custom, nftDeGods],
				filter: '987654321'
			});

			expect(res).toEqual([custom]);
		});

		it('keeps nameless NFTs in empty-filter results', () => {
			const nameless = {
				...nftAzuki1,
				name: undefined,
				id: parseNftId('42'),
				collection: {
					...nftAzuki1.collection,
					name: undefined
				}
			};

			const res = filterSortByCollection({
				items: [nameless],
				filter: ''
			});

			expect(res).toEqual([nameless]);
		});

		it('filters nameless NFTs by nft.id', () => {
			const nameless = {
				...nftAzuki1,
				name: undefined,
				id: parseNftId('424242'),
				collection: {
					...nftAzuki1.collection,
					name: undefined
				}
			};

			const res = filterSortByCollection({
				items: [nameless, nftDeGods],
				filter: '424242'
			});

			expect(res).toEqual([nameless]);
		});

		it('filters collection UIs by collection.name', () => {
			const res = filterSortByCollection({
				items: collections,
				filter: 'god'
			});

			expect(res).toHaveLength(1);
			expect(res[0].collection.address).toBe(DE_GODS_TOKEN.address);
		});

		it('filters collection UIs by inner nft.name', () => {
			const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN];
			const custom = { ...nftAzuki1, name: 'Ultra Rare Azuki' };
			const ui = getNftCollectionUi({
				$nonFungibleTokens: tokens,
				$nftStore: [custom]
			});
			const res = filterSortByCollection({ items: ui, filter: 'ultra rare' });

			expect(res).toHaveLength(1);
			expect(res[0].nfts).toEqual([custom]);
		});

		it('filters collection UIs by inner nft.id', () => {
			const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN];
			const custom = { ...nftAzuki1, id: parseNftId('123456789') };
			const ui = getNftCollectionUi({
				$nonFungibleTokens: tokens,
				$nftStore: [custom]
			});
			const res = filterSortByCollection({ items: ui, filter: '123456789' });

			expect(res).toHaveLength(1);
			expect(res[0].nfts).toEqual([custom]);
		});

		it('filters NFTs by collection.standard.code (case-insensitive substring)', () => {
			// every item in base has collection.standard.code === 'erc721'
			expect(filterSortByCollection({ items: base, filter: 'erc721' })).toEqual(base);
			expect(filterSortByCollection({ items: base, filter: 'ERC' })).toEqual(base);
			expect(filterSortByCollection({ items: base, filter: 'dip721' })).toEqual([]);
		});

		it('filters collection UIs by collection.standard.code (case-insensitive substring)', () => {
			// both collections are erc721
			const matched = filterSortByCollection({ items: collections, filter: 'erc721' });

			expect(matched).toHaveLength(2);
			expect(matched.every((c) => c.collection.standard?.code === 'erc721')).toBeTruthy();

			expect(filterSortByCollection({ items: collections, filter: 'ERC' })).toHaveLength(2);
			expect(filterSortByCollection({ items: collections, filter: 'dip721' })).toEqual([]);
		});

		it('filters NFTs by collection.standard.version and the combined `code version` label', () => {
			const extV2Nft = {
				...nftDeGods,
				collection: {
					...nftDeGods.collection,
					standard: { code: 'ext' as const, version: 'v2' }
				}
			};

			// version alone
			expect(filterSortByCollection({ items: [extV2Nft, ...base], filter: 'v2' })).toEqual([
				extV2Nft
			]);
			// combined `code version` UI label
			expect(filterSortByCollection({ items: [extV2Nft, ...base], filter: 'ext v2' })).toEqual([
				extV2Nft
			]);
			// case-insensitive
			expect(filterSortByCollection({ items: [extV2Nft, ...base], filter: 'EXT V2' })).toEqual([
				extV2Nft
			]);
		});

		it('sorts NFTs by collection name ascending', () => {
			const res = filterSortByCollection({
				items: base,
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res.map((n) => n.collection.name)).toEqual([
				'Azuki Elemental Beans',
				'Azuki Elemental Beans',
				'DeGods'
			]);
		});

		it('sorts NFTs by collection name descending', () => {
			const res = filterSortByCollection({
				items: base,
				sort: { type: 'collection-name', order: 'desc' }
			});

			expect(res.map((n) => n.collection.name)).toEqual([
				'DeGods',
				'Azuki Elemental Beans',
				'Azuki Elemental Beans'
			]);
		});

		it('sorts collection UIs by name ascending', () => {
			const res = filterSortByCollection({
				items: collections,
				sort: { type: 'collection-name', order: 'asc' }
			});
			const expected = [azukiName, deGodsName].sort((a, b) => collator.compare(a ?? '', b ?? ''));

			expect(res.map((c) => c.collection.name ?? '')).toEqual(expected);
		});

		it('sorts collection UIs by name descending', () => {
			const res = filterSortByCollection({
				items: collections,
				sort: { type: 'collection-name', order: 'desc' }
			});
			const expected = [azukiName, deGodsName]
				.sort((a, b) => collator.compare(a ?? '', b ?? ''))
				.reverse();

			expect(res.map((c) => c.collection.name ?? '')).toEqual(expected);
		});

		it('applies filter then sort for NFTs', () => {
			const res = filterSortByCollection({
				items: base,
				filter: 'god',
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).toEqual([nftDeGods]);
		});

		it('applies filter then sort for collections', () => {
			const res = filterSortByCollection({
				items: collections,
				filter: 'god',
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).toHaveLength(1);
			expect(res[0].collection.address).toBe(DE_GODS_TOKEN.address);
		});

		it('returns the same reference when neither filter nor sort is provided (NFTs)', () => {
			const input = [...base];
			const res = filterSortByCollection({ items: input });

			expect(res).toBe(input);
		});

		it('returns the same reference when neither filter nor sort is provided (collections)', () => {
			const input = [...collections];
			const res = filterSortByCollection({ items: input });

			expect(res).toBe(input);
		});

		it('returns a new array when sort is provided (NFTs)', () => {
			const input = [...base];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).not.toBe(input);
		});

		it('returns a new array when sort is provided (collections)', () => {
			const input = [...collections];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'collection-name', order: 'asc' }
			});

			expect(res).not.toBe(input);
		});
	});

	describe('filterSortByCollection - date sorting', () => {
		it('sorts NFTs by acquiredAt ascending', () => {
			const nftOld = {
				...nftAzuki1,
				acquiredAt: new Date('2020-01-01')
			};
			const nftNew = {
				...nftAzuki2,
				acquiredAt: new Date('2022-01-01')
			};
			const nftNewest = {
				...nftDeGods,
				acquiredAt: new Date('2023-01-01')
			};

			const input = [nftNew, nftNewest, nftOld];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'date', order: 'asc' }
			});

			expect(res).toEqual([nftOld, nftNew, nftNewest]);
		});

		it('sorts NFTs by acquiredAt descending', () => {
			const nftOld = {
				...nftAzuki1,
				acquiredAt: new Date('2020-01-01')
			};
			const nftNew = {
				...nftAzuki2,
				acquiredAt: new Date('2022-01-01')
			};
			const nftNewest = {
				...nftDeGods,
				acquiredAt: new Date('2023-01-01')
			};

			const input = [nftOld, nftNewest, nftNew];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'date', order: 'desc' }
			});

			expect(res).toEqual([nftNewest, nftNew, nftOld]);
		});

		it('handles NFTs with missing acquiredAt gracefully', () => {
			const nftWithDate = {
				...nftAzuki1,
				acquiredAt: new Date('2021-01-01')
			};
			const nftWithoutDate = {
				...nftAzuki2,
				acquiredAt: undefined
			};

			const input = [nftWithoutDate, nftWithDate];
			const res = filterSortByCollection({
				items: input,
				sort: { type: 'date', order: 'asc' }
			});

			expect(res[0]).toBe(nftWithoutDate);
			expect(res[1]).toBe(nftWithDate);
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

	describe('getMediaStatus', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		it('returns OK for valid image under the size limit', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'image/png'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});

			const result = await getMediaStatus('https://example.com/image.png');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns OK for valid gif under the size limit', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? '.gif;charset=utf-8'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});

			const result = await getMediaStatus('https://example.com/image.gif');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns OK for valid video under the size limit', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'video/mp4'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});

			const result = await getMediaStatus('https://example.com/video.mp4');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns OK for data image URLs without fetching', async () => {
			global.fetch = vi.fn();

			const result = await getMediaStatus('data:image/png;base64,iVBORw0KGgo=');

			expect(result).toBe(MediaStatusEnum.OK);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('returns OK for padded base64 data image URLs without overcounting size', async () => {
			global.fetch = vi.fn();

			const result = await getMediaStatus('data:image/png;base64,TQ==');

			expect(result).toBe(MediaStatusEnum.OK);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('returns NON_SUPPORTED_MEDIA_TYPE for non-media data URLs', async () => {
			global.fetch = vi.fn();

			const result = await getMediaStatus('data:text/html;base64,PGgxPkhlbGxvPC9oMT4=');

			expect(result).toBe(MediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('returns FILESIZE_LIMIT_EXCEEDED for oversized data media URLs without fetching', async () => {
			global.fetch = vi.fn();

			const result = await getMediaStatus(
				`data:image/png,${'a'.repeat(NFT_MAX_FILESIZE_LIMIT + 1)}`
			);

			expect(result).toBe(MediaStatusEnum.FILESIZE_LIMIT_EXCEEDED);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('returns INVALID_DATA for invalid URL', async () => {
			const result = await getMediaStatus('not-a-url');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns INVALID_DATA when fetch throws', async () => {
			global.fetch = vi.fn().mockRejectedValueOnce(new Error('network error'));

			const result = await getMediaStatus('https://example.com/image.png');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns INVALID_DATA when headers are missing', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: { get: () => null }
			});

			const result = await getMediaStatus('https://example.com/image.png');

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns OK for application/octet-stream byte-stream assets under the size limit', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'application/octet-stream'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});

			const result = await getMediaStatus(
				'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3Aabc&owner_id=ipchn-lqaaa-aaaam-qizkq-cai&project_id=019de6f2-675c-775e-9eda-2adf4341566c'
			);

			expect(result).toBe(MediaStatusEnum.OK);
		});

		it('returns NON_SUPPORTED_MEDIA_TYPE for non-image and non-video type', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type' ? 'text/html' : h === 'Content-Length' ? '100' : null
				}
			});

			const result = await getMediaStatus('https://example.com/page.html');

			expect(result).toBe(MediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE);
		});

		it('returns FILESIZE_LIMIT_EXCEEDED when file size exceeds the limit', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'image/jpeg'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT + 1).toString()
								: null
				}
			});

			const result = await getMediaStatus('https://example.com/large.jpg');

			expect(result).toBe(MediaStatusEnum.FILESIZE_LIMIT_EXCEEDED);
		});

		it('fetches the data for IPFS URLs', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'image/png'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});

			const result = await getMediaStatus('ipfs://ipfs-image-url');

			expect(result).toBe(MediaStatusEnum.OK);

			expect(global.fetch).toHaveBeenCalledExactlyOnceWith('https://ipfs.io/ipfs/ipfs-image-url', {
				method: 'HEAD'
			});
		});
	});

	describe('getMediaStatusOrCache', () => {
		const mockUrl = 'https://example.com/image.png';

		beforeEach(() => {
			vi.clearAllMocks();

			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'image/png'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT - 100).toString()
								: null
				}
			});
		});

		it('should fetch and cache value if not available', async () => {
			const result = await getMediaStatusOrCache(mockUrl);

			expect(result).toBe(MediaStatusEnum.OK);

			expect(global.fetch).toHaveBeenCalledExactlyOnceWith(mockUrl, { method: 'HEAD' });
		});

		it('should return cached value if available', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? 'image/png'
							: h === 'Content-Length'
								? (NFT_MAX_FILESIZE_LIMIT + 100).toString() // Should have returned FILESIZE_LIMIT_EXCEEDED
								: null
				}
			});

			const result = await getMediaStatusOrCache(mockUrl);

			expect(result).toBe(MediaStatusEnum.OK);

			expect(global.fetch).not.toHaveBeenCalled();
		});
	});
});

describe('getNftCountsByNetwork', () => {
	const ethNft: Nft = {
		...mockValidErc721Nft,
		collection: { ...mockValidErc721Nft.collection, network: ETHEREUM_NETWORK }
	};
	const icpNft: Nft = {
		...mockValidErc721Nft,
		collection: { ...mockValidErc721Nft.collection, network: ICP_NETWORK }
	};

	it('returns a zero total and no networks for an empty list', () => {
		expect(getNftCountsByNetwork([])).toEqual({ total: 0, byNetwork: [] });
	});

	it('totals the NFTs and groups them per network, ordered by count descending', () => {
		const { total, byNetwork } = getNftCountsByNetwork([ethNft, icpNft, ethNft]);

		expect(total).toBe(3);
		expect(byNetwork).toHaveLength(2);
		expect(byNetwork[0]).toEqual({ network: ETHEREUM_NETWORK, count: 2 });
		expect(byNetwork[1]).toEqual({ network: ICP_NETWORK, count: 1 });
	});
});
