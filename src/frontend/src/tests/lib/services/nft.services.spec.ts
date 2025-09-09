import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import { loadNfts } from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import type { NonFungibleToken } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { Network } from 'ethers/providers';
import { get } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(),
	AlchemyProvider: vi.fn()
}));

describe('nft.services', () => {
	const mockAlchemyProvider = {
		network: new Network('ethereum', 1),
		provider: {},
		getNftsByOwner: vi.fn()
	} as unknown as AlchemyProvider;

	describe('loadNfts', () => {
		const mockNft1 = {
			...mockValidErc721Nft,
			id: parseNftId(123),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft2 = {
			...mockValidErc721Nft,
			id: parseNftId(321),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft3 = {
			...mockValidErc1155Nft,
			id: parseNftId(876),
			collection: {
				...mockValidErc1155Nft.collection,
				address: NYAN_CAT_TOKEN.address,
				network: NYAN_CAT_TOKEN.network
			}
		};

		const erc721AzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true };
		const erc1155NyanCatToken = { ...NYAN_CAT_TOKEN, version: BigInt(1), enabled: true };
		const mockWalletAddress = mockEthAddress;

		beforeEach(() => {
			vi.clearAllMocks();

			nftStore.resetAll();

			vi.mocked(alchemyProviders).mockReturnValue(mockAlchemyProvider);
		});

		it('should not load NFTs if no tokens were provided', async () => {
			const tokens: NonFungibleToken[] = [];

			await loadNfts({ tokens, walletAddress: mockWalletAddress });

			expect(mockAlchemyProvider.getNftsByOwner).not.toHaveBeenCalled();
		});

		it('should load ERC721 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft1, mockNft2]);

			await loadNfts({ tokens, walletAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft1, mockNft2]);
		});

		it('should load ERC1155 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft3]);

			await loadNfts({ tokens, walletAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft3]);
		});

		it('should handle nfts loading error gracefully', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockRejectedValueOnce(new Error('Nfts Error'));

			await loadNfts({ tokens, walletAddress: mockWalletAddress });

			expect(mockAlchemyProvider.getNftsByOwner).toHaveBeenCalled();
			expect(get(nftStore)).toEqual([]);
		});
	});
});
