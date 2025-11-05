import { pageCollectionNfts, pageNft } from '$lib/derived/page-nft.derived';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { get } from 'svelte/store';

describe('page-nft.derived', () => {
	const mockNft1 = mockValidErc1155Nft;
	const mockNft2 = { ...mockValidErc1155Nft, id: parseNftId('837364') };
	const mockNft3 = {
		...mockValidErc1155Nft,
		id: parseNftId('376428'),
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
			mockPage.mock({
				collection: mockNft1.collection.address,
				network: `${mockNft1.collection.network.id.description}`
			});

			nftStore.resetAll();

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when no collection in route', () => {
			mockPage.mock({ network: `${mockNft1.collection.network.id.description}` });

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when no network in route', () => {
			mockPage.mock({ collection: mockNft1.collection.address });

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it.each([mockNft1, mockNft2])(
			'should find all the NFTs of the collection of $name NFT',
			(nft) => {
				mockPage.mock({
					collection: nft.collection.address,
					network: `${nft.collection.network.id.description}`
				});

				expect(get(pageCollectionNfts)).toStrictEqual([mockNft1, mockNft2]);
			}
		);

		it.each([mockNft3])('should find only one NFT of the collection of $name NFT', (nft) => {
			mockPage.mock({
				collection: nft.collection.address,
				network: `${nft.collection.network.id.description}`
			});

			expect(get(pageCollectionNfts)).toStrictEqual([mockNft3]);
		});

		it('should return empty array when NFT collection matches but network does not', () => {
			const mockToken = { ...mockNft1, enabled: true };
			mockPage.mock({
				collection: mockToken.collection.address,
				network: 'non-existent-network'
			});

			expect(get(pageCollectionNfts)).toStrictEqual([]);
		});

		it('should return empty array when NFT network matches but name does not', () => {
			const mockToken = { ...mockNft1, enabled: true };
			mockPage.mock({
				collection: 'non-existent-collection',
				network: `${mockToken.collection.network.id.description}`
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
			mockPage.mock({
				nft: mockNft1.id,
				collection: mockNft1.collection.address,
				network: `${mockNft1.collection.network.id.description}`
			});

			nftStore.resetAll();

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when no collection in route', () => {
			mockPage.mock({
				nft: mockNft1.id,
				network: `${mockNft1.collection.network.id.description}`
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when no network in route', () => {
			mockPage.mock({
				nft: mockNft1.id,
				collection: mockNft1.collection.address
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when page NFT is undefined', () => {
			mockPage.mock({
				collection: mockNft1.collection.address,
				network: `${mockNft1.collection.network.id.description}`
			});

			expect(get(pageNft)).toBeUndefined();

			mockPage.mock({
				nft: mockNft1.id.toString(),
				collection: 'non-existent-collection',
				network: `${mockNft1.collection.network.id.description}`
			});

			expect(get(pageNft)).toBeUndefined();

			mockPage.mock({
				nft: mockNft1.id.toString(),
				collection: 'non-existent-collection',
				network: `${mockNft1.collection.network.id.description}`
			});

			expect(get(pageNft)).toBeUndefined();
		});

		it('should return undefined when page NFT is not a number', () => {
			mockPage.mock({
				nft: 'not-a-number',
				collection: mockNft1.collection.address,
				network: `${mockNft1.collection.network.id.description}`
			});

			expect(get(pageNft)).toBeUndefined();
		});
	});
});
