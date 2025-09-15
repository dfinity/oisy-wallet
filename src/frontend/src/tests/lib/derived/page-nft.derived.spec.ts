import { pageCollectionNfts, pageNft } from '$lib/derived/page-nft.derived';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { get } from 'svelte/store';

describe('page-nft.derived', () => {
	const mockNft1 = mockValidErc1155Nft;
	const mockNft2 = { ...mockValidErc1155Nft, id: parseNftId(837364) };
	const mockNft3 = {
		...mockValidErc1155Nft,
		id: parseNftId(376428),
		balance: 5,
		collection: {
			...mockValidErc1155Nft.collection,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			networkId: AZUKI_ELEMENTAL_BEANS_TOKEN.network
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		nftStore.resetAll();
		nftStore.addAll([mockNft1, mockNft2, mockNft3]);
	});

	describe('pageCollectionNfts', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockPage.reset();
		});

		it('should return empty array when the NFT store is not initialized', () => {
			mockPage.mockDynamicRoutes({
				collectionId: mockNft1.collection.address,
				networkId: `${mockNft1.collection.network.name}`
			});

			nftStore.resetAll();

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when no collection in route', () => {
			mockPage.mockDynamicRoutes({ networkId: `${mockNft1.collection.network.name}` });

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when no network in route', () => {
			mockPage.mockDynamicRoutes({ collectionId: mockNft1.collection.address });

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it.each([mockNft1, mockNft2])(
			'should find all the NFTs of the collection of $name NFT',
			(nft) => {
				mockPage.mockDynamicRoutes({
					collectionId: nft.collection.address,
					networkId: `${nft.collection.network.name}`
				});

				expect(get(pageCollectionNfts)).toStrictEqual([mockNft1, mockNft2]);
			}
		);

		it.each([mockNft3])('should find only one NFT of the collection of $name NFT', (nft) => {
			mockPage.mockDynamicRoutes({
				collectionId: nft.collection.address,
				networkId: `${nft.collection.network.name}`
			});

			expect(get(pageCollectionNfts)).toStrictEqual([mockNft3]);
		});

		it('should return empty array when NFT collection matches but network does not', () => {
			const mockToken = { ...mockNft1, enabled: true };
			mockPage.mockDynamicRoutes({
				collectionId: mockToken.collection.address,
				networkId: 'non-existent-network'
			});

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when NFT network matches but name does not', () => {
			const mockToken = { ...mockNft1, enabled: true };
			mockPage.mockDynamicRoutes({
				collectionId: 'non-existent-collection',
				networkId: `${mockToken.collection.network.name}`
			});

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});
	});

	describe('pageNft', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockPage.reset();
		});

		it('should return undefined when the NFT store is not initialized', () => {
			mockPage.mockDynamicRoutes({
				nftId: mockNft1.id.toString(),
				collectionId: mockNft1.collection.address,
				networkId: `${mockNft1.collection.network.name}`
			});

			nftStore.resetAll();

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when no collection in route', () => {
			mockPage.mockDynamicRoutes({
				nftId: mockNft1.id.toString(),
				networkId: `${mockNft1.collection.network.name}`
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when no network in route', () => {
			mockPage.mockDynamicRoutes({
				nftId: mockNft1.id.toString(),
				collectionId: mockNft1.collection.address
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when page NFT is undefined', () => {
			mockPage.mockDynamicRoutes({
				collectionId: mockNft1.collection.address,
				networkId: `${mockNft1.collection.network.name}`
			});

			expect(get(pageNft)).toBeUndefined();

			mockPage.mockDynamicRoutes({
				nftId: mockNft1.id.toString(),
				collectionId: 'non-existent-collection',
				networkId: `${mockNft1.collection.network.name}`
			});

			expect(get(pageNft)).toBeUndefined();

			mockPage.mockDynamicRoutes({
				nftId: mockNft1.id.toString(),
				collectionId: 'non-existent-collection',
				networkId: `${mockNft1.collection.network.name}`
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when page NFT is not a number', () => {
			mockPage.mockDynamicRoutes({
				nftId: 'not-a-number',
				collectionId: mockNft1.collection.address,
				networkId: `${mockNft1.collection.network.name}`
			});

			expect(get(pageNft)).toBeUndefined();
		});
	});
});
