import { nftStore } from '$lib/stores/nft.store';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
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

		it('should add NFT with same token id but different contract address', () => {
			const similarNft: Nft = {
				...mockValidErc721Nft,
				contract: { ...mockValidErc721Nft.contract, address: mockEthAddress2 }
			};

			nftStore.addAll([mockValidErc721Nft, similarNft]);

			expect(get(nftStore)).toEqual([mockValidErc721Nft, similarNft]);
		});
	});
});
