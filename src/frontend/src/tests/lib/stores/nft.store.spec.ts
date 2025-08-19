import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { get } from 'svelte/store';

describe('nftStore', () => {
	beforeEach(() => {
		nftStore.resetAll();
	});

	it('should initialize store with undefined', () => {
		expect(get(nftStore)).toBeUndefined();
	});

	describe('addAll', () => {
		it('should add NFTs to store', () => {
			const mockNft1 = mockValidErc721Nft;
			const mockNft2 = { ...mockValidErc721Nft, id: parseNftId(837364) };

			nftStore.addAll([mockNft1, mockNft2]);

			expect(get(nftStore)).toEqual([mockNft1, mockNft2]);
		});

		it('should not add already existing NFTs to store', () => {
			const duplicateNft = { ...mockValidErc721Nft };

			nftStore.addAll([mockValidErc721Nft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft]);

			nftStore.addAll([duplicateNft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft]);
		});

		it('should add NFT with same token id but different collection address', () => {
			const similarNft: Nft = {
				...mockValidErc721Nft,
				collection: { ...mockValidErc721Nft.collection, address: mockEthAddress2 }
			};

			nftStore.addAll([mockValidErc721Nft, similarNft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft, similarNft]);
		});
	});

	describe('removeSelectedNfts', () => {
		const mockNft1 = mockValidErc721Nft;
		const mockNft2 = { ...mockValidErc721Nft, id: parseNftId(837364) };
		const mockNft3 = {
			...mockValidErc721Nft,
			id: parseNftId(376428),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};

		beforeEach(() => {
			nftStore.addAll([mockNft1, mockNft2, mockNft3]);
		});

		it('should remove NFTs from store', () => {
			nftStore.removeSelectedNfts([mockNft1, mockNft3]);

			expect(get(nftStore)).toEqual([mockNft2]);
		});

		it('should do nothing when trying to remove from undefined store', () => {
			nftStore.resetAll();

			nftStore.removeSelectedNfts([mockNft1, mockNft3]);

			expect(get(nftStore)).toBeUndefined();
		});

		it('should do nothing when trying to remove from empty store', () => {
			nftStore.resetAll();
			nftStore.addAll([]);

			nftStore.removeSelectedNfts([mockNft1, mockNft3]);

			expect(get(nftStore)).toEqual([]);
		});

		it('should do nothing when removal array is empty', () => {
			nftStore.removeSelectedNfts([]);

			expect(get(nftStore)).toEqual([mockNft1, mockNft2, mockNft3]);
		});

		it('should handle tokens and networks correctly', () => {
			nftStore.removeSelectedNfts([
				{
					...mockNft2,
					collection: {
						...mockNft2.collection,
						network: DE_GODS_TOKEN.network,
						address: DE_GODS_TOKEN.address
					}
				}
			]);

			expect(get(nftStore)).toEqual([mockNft1, mockNft2, mockNft3]);
		});
	});
});
