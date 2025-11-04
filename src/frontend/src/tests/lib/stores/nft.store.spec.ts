import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
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
			const mockNft2 = { ...mockValidErc721Nft, id: parseNftId('837364') };

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

		it('should update already existing NFTs to store', () => {
			const duplicateNft = { ...mockValidErc721Nft, imageUrl: 'newUrl' };

			nftStore.addAll([mockValidErc721Nft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft]);

			nftStore.addAll([duplicateNft]);

			expect(get(nftStore)).toEqual([duplicateNft]);
		});

		it('should add NFT with same token id but different collection address', () => {
			const similarNft: Nft = {
				...mockValidErc721Nft,
				collection: { ...mockValidErc721Nft.collection, address: mockEthAddress2 }
			};

			nftStore.addAll([mockValidErc721Nft, similarNft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft, similarNft]);
		});

		it('should add NFT with address written in different case', () => {
			nftStore.addAll([mockValidErc721Nft]);

			const similarNft: Nft = {
				...mockValidErc721Nft,
				collection: {
					...mockValidErc721Nft.collection,
					address: mockValidErc1155Nft.collection.address.toUpperCase()
				}
			};

			nftStore.addAll([similarNft]);

			expect(get(nftStore)).toEqual([similarNft]);
		});
	});

	describe('setAllByNetwork', () => {
		const mockNft1 = mockValidErc721Nft;
		const mockNft2 = { ...mockValidErc721Nft, id: parseNftId('837364') };
		const mockNfts = [mockNft1, mockNft2];
		const mockNetwordId = mockNft1.collection.network.id;
		const mockParams = { networkId: mockNetwordId, nfts: mockNfts };

		it('should return the new NFTs if the store is nullish', () => {
			nftStore.resetAll();

			nftStore.setAllByNetwork(mockParams);

			expect(get(nftStore)).toEqual(mockNfts);
		});

		it('should add new NFTs if the store is not nullish', () => {
			const existingNft = {
				...mockValidErc721Nft,
				collection: { ...mockValidErc721Nft.collection, network: ARBITRUM_MAINNET_NETWORK }
			};

			nftStore.addAll([existingNft]);

			nftStore.setAllByNetwork(mockParams);

			expect(get(nftStore)).toEqual([existingNft, ...mockNfts]);
		});

		it('should replace only NFTs from the specified network', () => {
			nftStore.addAll(mockNfts);

			const newNft = { ...mockValidErc721Nft, id: parseNftId('123456') };

			nftStore.setAllByNetwork({ ...mockParams, nfts: [newNft] });

			expect(get(nftStore)).toEqual([newNft]);
		});
	});
});
