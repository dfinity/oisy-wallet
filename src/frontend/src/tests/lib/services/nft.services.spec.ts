import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import { etherscanProviders, type EtherscanProvider } from '$eth/providers/etherscan.providers';
import {
	infuraErc1155Providers,
	type InfuraErc1155Provider
} from '$eth/providers/infura-erc1155.providers';
import {
	infuraErc721Providers,
	type InfuraErc721Provider
} from '$eth/providers/infura-erc721.providers';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { TRACK_ETH_LOADING_NFT_IDS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { loadNfts } from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { waitFor } from '@testing-library/svelte';
import { Network } from 'ethers/providers';
import { get } from 'svelte/store';

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn(),
	EtherscanProvider: vi.fn()
}));

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(),
	AlchemyProvider: vi.fn()
}));

vi.mock('$eth/providers/infura-erc721.providers', () => ({
	infuraErc721Providers: vi.fn(),
	InfuraErc721Provider: vi.fn()
}));

vi.mock('$eth/providers/infura-erc1155.providers', () => ({
	infuraErc1155Providers: vi.fn(),
	InfuraErc1155Provider: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('nft.services', () => {
	const mockEtherscanProvider = {
		network: new Network('ethereum', 1),
		chainId: 1,
		provider: {},
		transactions: vi.fn(),
		erc20Transactions: vi.fn(),
		erc721TokenInventory: vi.fn(),
		getHistory: vi.fn(),
		getInternalHistory: vi.fn()
	} as unknown as EtherscanProvider;

	const mockAlchemyProvider = {
		network: new Network('ethereum', 1),
		provider: {},
		getNftIdsForOwner: vi.fn()
	} as unknown as AlchemyProvider;

	const mockInfuraErc721Provider = {
		network: new Network('ethereum', 1),
		chainId: 1,
		provider: {},
		getNftMetadata: vi.fn()
	} as unknown as InfuraErc721Provider;

	const mockInfuraErc1155Provider = {
		network: new Network('ethereum', 1),
		chainId: 1,
		provider: {},
		getNftMetadata: vi.fn(),
		balanceOf: vi.fn()
	} as unknown as InfuraErc1155Provider;

	describe('loadNfts', () => {
		const erc721AzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true };
		const erc1155NyanCatToken = { ...NYAN_CAT_TOKEN, version: BigInt(1), enabled: true };
		const mockWalletAddress = mockEthAddress;

		beforeEach(() => {
			vi.clearAllMocks();

			nftStore.resetAll();

			vi.mocked(etherscanProviders).mockReturnValue(mockEtherscanProvider);
			vi.mocked(alchemyProviders).mockReturnValue(mockAlchemyProvider);
			vi.mocked(infuraErc721Providers).mockReturnValue(mockInfuraErc721Provider);
			vi.mocked(infuraErc1155Providers).mockReturnValue(mockInfuraErc1155Provider);

			vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockImplementation(({ tokenId }) =>
				Promise.resolve({
					id: tokenId,
					name: `Test NFT ERC721 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`
				})
			);
			vi.mocked(mockInfuraErc1155Provider.getNftMetadata).mockImplementation(({ tokenId }) =>
				Promise.resolve({
					id: tokenId,
					name: `Test NFT ERC1155 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`
				})
			);
		});

		it('should not load NFTs if no tokens were provided', async () => {
			const tokens: NonFungibleToken[] = [];

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(mockEtherscanProvider.erc721TokenInventory).not.toHaveBeenCalled();
			expect(mockAlchemyProvider.getNftIdsForOwner).not.toHaveBeenCalled();
			expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.balanceOf).not.toHaveBeenCalled();
		});

		it('should load NFTs of tokens', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken, erc1155NyanCatToken];
			const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(parseNftId);

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockResolvedValueOnce(tokenIds);
			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockResolvedValueOnce(
				tokenIds.map((tokenId) => ({ id: tokenId, balance: 1 }))
			);
			vi.mocked(mockInfuraErc1155Provider.balanceOf).mockResolvedValue(2);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			const expectedNfts = [
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC721 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc721AzukiToken)
				})),
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC1155 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc1155NyanCatToken),
					balance: 2
				}))
			];

			await waitFor(() => {
				tokenIds.forEach((tokenId) => {
					expect(mockInfuraErc721Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: AZUKI_ELEMENTAL_BEANS_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: NYAN_CAT_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.balanceOf).toHaveBeenCalledWith(
						expect.objectContaining({
							contractAddress: NYAN_CAT_TOKEN.address,
							walletAddress: mockWalletAddress,
							tokenId
						})
					);
				});

				expect(get(nftStore)?.length).toEqual(expectedNfts.length);
				expect(get(nftStore)).toEqual(expect.arrayContaining(expectedNfts));
			});
		}, 10000);

		it('should skip already loaded NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken, erc1155NyanCatToken];

			const loadedTokenIds = [1, 2, 3, 4, 5, 6].map(parseNftId);
			const notLoadedTokenIds = [7, 8, 9, 10, 11, 12].map(parseNftId);

			const loadedNfts: Nft[] = [
				...loadedTokenIds.map((tokenId) => ({
					id: tokenId,
					collection: erc721AzukiToken
				})),
				...loadedTokenIds.map((tokenId) => ({
					id: tokenId,
					collection: erc1155NyanCatToken,
					balance: 3
				}))
			];

			const tokenIds = [...loadedTokenIds, ...notLoadedTokenIds];

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockResolvedValueOnce(tokenIds);
			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockResolvedValueOnce(
				tokenIds.map((tokenId) => ({ id: tokenId, balance: 1 }))
			);
			vi.mocked(mockInfuraErc1155Provider.balanceOf).mockResolvedValue(2);

			await loadNfts({ tokens, loadedNfts, walletAddress: mockWalletAddress });

			const expectedNfts = [
				...notLoadedTokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC721 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc721AzukiToken)
				})),
				...notLoadedTokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC1155 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc1155NyanCatToken),
					balance: 2
				}))
			];

			await waitFor(() => {
				loadedTokenIds.forEach((tokenId) => {
					expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: AZUKI_ELEMENTAL_BEANS_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.getNftMetadata).not.toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: NYAN_CAT_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.balanceOf).not.toHaveBeenCalledWith(
						expect.objectContaining({
							contractAddress: NYAN_CAT_TOKEN.address,
							walletAddress: mockWalletAddress,
							tokenId
						})
					);
				});

				notLoadedTokenIds.forEach((tokenId) => {
					expect(mockInfuraErc721Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: AZUKI_ELEMENTAL_BEANS_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: NYAN_CAT_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.balanceOf).toHaveBeenCalledWith(
						expect.objectContaining({
							contractAddress: NYAN_CAT_TOKEN.address,
							walletAddress: mockWalletAddress,
							tokenId
						})
					);
				});

				expect(get(nftStore)?.length).toEqual(expectedNfts.length);
				expect(get(nftStore)).toEqual(expect.arrayContaining(expectedNfts));
			});
		});

		it('should handle token inventory loading error gracefully', async () => {
			const tokens: Erc721CustomToken[] = [erc721AzukiToken];

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockRejectedValueOnce(
				new Error('Inventory Error')
			);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(mockEtherscanProvider.erc721TokenInventory).toHaveBeenCalled();
			expect(mockAlchemyProvider.getNftIdsForOwner).not.toHaveBeenCalled();
			expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.balanceOf).not.toHaveBeenCalled();
		});

		it('should handle nft ids loading error gracefully', async () => {
			const tokens: Erc1155CustomToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockRejectedValueOnce(
				new Error('Nft ids Error')
			);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(mockEtherscanProvider.erc721TokenInventory).not.toHaveBeenCalled();
			expect(mockAlchemyProvider.getNftIdsForOwner).toHaveBeenCalled();
			expect(mockInfuraErc721Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.getNftMetadata).not.toHaveBeenCalled();
			expect(mockInfuraErc1155Provider.balanceOf).not.toHaveBeenCalled();
		});

		it('should handle metadata fetch error gracefully', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken, erc1155NyanCatToken];
			const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(parseNftId);

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockResolvedValueOnce(tokenIds);
			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockResolvedValueOnce(
				tokenIds.map((tokenId) => ({ id: tokenId, balance: 1 }))
			);
			vi.mocked(mockInfuraErc721Provider.getNftMetadata).mockRejectedValue(
				new Error('Metadata Error')
			);
			vi.mocked(mockInfuraErc1155Provider.getNftMetadata).mockRejectedValue(
				new Error('Metadata Error')
			);
			vi.mocked(mockInfuraErc1155Provider.balanceOf).mockResolvedValue(2);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			const expectedNfts = [
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					collection: mapTokenToCollection(erc721AzukiToken)
				})),
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					collection: mapTokenToCollection(erc1155NyanCatToken),
					balance: 2
				}))
			];

			await waitFor(() => {
				tokenIds.forEach((tokenId) => {
					expect(mockInfuraErc721Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: AZUKI_ELEMENTAL_BEANS_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: NYAN_CAT_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.balanceOf).toHaveBeenCalledWith(
						expect.objectContaining({
							contractAddress: NYAN_CAT_TOKEN.address,
							walletAddress: mockWalletAddress,
							tokenId
						})
					);
				});

				expect(get(nftStore)?.length).toEqual(expectedNfts.length);
				expect(get(nftStore)).toEqual(expect.arrayContaining(expectedNfts));
			});
		}, 10000);

		it('should handle balance fetch error gracefully', async () => {
			const tokens: Erc1155CustomToken[] = [erc1155NyanCatToken];
			const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(parseNftId);

			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockResolvedValueOnce(
				tokenIds.map((tokenId) => ({ id: tokenId, balance: 1 }))
			);
			vi.mocked(mockInfuraErc1155Provider.balanceOf).mockRejectedValue(
				new Error('BalanceOf Error')
			);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			const expectedNfts = tokenIds.map((tokenId) => ({
				id: tokenId,
				name: `Test NFT ERC1155 #${tokenId}`,
				imageUrl: `https://test.com/image-${tokenId}.png`,
				collection: mapTokenToCollection(erc1155NyanCatToken)
			}));

			await waitFor(() => {
				tokenIds.forEach((tokenId) => {
					expect(mockInfuraErc1155Provider.getNftMetadata).toHaveBeenCalledWith(
						expect.objectContaining({
							tokenId,
							contractAddress: NYAN_CAT_TOKEN.address
						})
					);

					expect(mockInfuraErc1155Provider.balanceOf).toHaveBeenCalledWith(
						expect.objectContaining({
							contractAddress: NYAN_CAT_TOKEN.address,
							walletAddress: mockWalletAddress,
							tokenId
						})
					);
				});

				expect(get(nftStore)?.length).toEqual(expectedNfts.length);
				expect(get(nftStore)).toEqual(expect.arrayContaining(expectedNfts));
			});
		}, 10000);

		it('should not raise if Etherscan providers raise', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken, erc1155NyanCatToken];
			const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(parseNftId);

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockImplementation(() => {
				throw new Error('Etherscan Provider Error');
			});

			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockResolvedValueOnce(
				tokenIds.map((tokenId) => ({ id: tokenId, balance: 1 }))
			);

			const expectedNfts = [
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC1155 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc1155NyanCatToken)
				}))
			];

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(etherscanProviders).toHaveBeenCalled();

			expect(get(nftStore)).toStrictEqual(expectedNfts);

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_ETH_LOADING_NFT_IDS_ERROR,
				metadata: {
					tokenId: `${erc721AzukiToken.id.description}`,
					networkId: `${erc721AzukiToken.network.id.description}`,
					standard: erc721AzukiToken.standard,
					error: 'Error: Etherscan Provider Error'
				},
				warning: 'Failed to load NFT IDs: Error: Etherscan Provider Error'
			});
		}, 10000);

		it('should not raise if Alchemy providers raise', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken, erc1155NyanCatToken];
			const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(parseNftId);

			vi.mocked(mockAlchemyProvider.getNftIdsForOwner).mockImplementation(() => {
				throw new Error('Alchemy Provider Error');
			});

			vi.mocked(mockEtherscanProvider.erc721TokenInventory).mockResolvedValueOnce(tokenIds);

			const expectedNfts = [
				...tokenIds.map((tokenId) => ({
					id: tokenId,
					name: `Test NFT ERC721 #${tokenId}`,
					imageUrl: `https://test.com/image-${tokenId}.png`,
					collection: mapTokenToCollection(erc721AzukiToken)
				}))
			];

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(alchemyProviders).toHaveBeenCalled();

			expect(get(nftStore)).toStrictEqual(expectedNfts);

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_ETH_LOADING_NFT_IDS_ERROR,
				metadata: {
					tokenId: `${erc1155NyanCatToken.id.description}`,
					networkId: `${erc1155NyanCatToken.network.id.description}`,
					standard: erc1155NyanCatToken.standard,
					error: 'Error: Alchemy Provider Error'
				},
				warning: 'Failed to load NFT IDs: Error: Alchemy Provider Error'
			});
		}, 10000);
	});
});
