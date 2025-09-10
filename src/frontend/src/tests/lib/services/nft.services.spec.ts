import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as nftSendServices from '$eth/services/nft-send.services';
import * as authServices from '$lib/services/auth.services';
import { loadNfts, sendNft } from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import type { NonFungibleToken } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(mockAlchemyProvider.getNftsByOwner).not.toHaveBeenCalled();
		});

		it('should load ERC721 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft1, mockNft2]);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft1, mockNft2]);
		});

		it('should load ERC1155 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft3]);

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft3]);
		});

		it('should handle nfts loading error gracefully', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockRejectedValueOnce(new Error('Nfts Error'));

			await loadNfts({ tokens, loadedNfts: [], walletAddress: mockWalletAddress });

			expect(mockAlchemyProvider.getNftsByOwner).toHaveBeenCalled();
			expect(get(nftStore)).toEqual([]);
		});
	});

	describe('sendNft', () => {
		const fromAddress = '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95';
		const destination = '0x389658cb7961b6f5d0daec1cdb9df258e799acb0';

		const gas = 70_492n;
		const maxFeePerGas = 5_000_000n;
		const maxPriorityFeePerGas = 2_000_000n;

		const transfer721Spy = vi.spyOn(nftSendServices, 'transferErc721').mockResolvedValue({} as any);

		const transfer1155Spy = vi
			.spyOn(nftSendServices, 'transferErc1155')
			.mockResolvedValue({} as any);

		const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue(undefined as any);

		const token721: NonFungibleToken = {
			address: fromAddress,
			category: 'custom',
			decimals: 0,
			id: parseTokenId('721'),
			name: 'My721',
			network: ETHEREUM_NETWORK,
			standard: 'erc721',
			symbol: 'MY721'
		};

		const token1155: NonFungibleToken = {
			address: fromAddress,
			category: 'custom',
			decimals: 0,
			id: parseTokenId('1155'),
			name: 'My1155',
			network: ETHEREUM_NETWORK,
			standard: 'erc1155',
			symbol: 'MY1155'
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it('calls transferErc721 for an ERC-721 token with the expected params', async () => {
			const tokenId = parseNftId(1);

			const progress = vi.fn();

			await sendNft({
				token: token721,
				tokenId,
				destination,
				fromAddress,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});

			expect(transfer721Spy).toHaveBeenCalledOnce();
			expect(transfer1155Spy).not.toHaveBeenCalled();

			// Assert payload
			expect(transfer721Spy).toHaveBeenCalledWith({
				contractAddress: token721.address,
				tokenId, // same value forwarded
				sourceNetwork: token721.network,
				from: fromAddress,
				to: destination,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
		});

		it('calls transferErc1155 for an ERC-1155 token with id=tokenId and amount=1n', async () => {
			const tokenId = parseNftId(725432);
			const progress = vi.fn();

			await sendNft({
				token: token1155,
				tokenId,
				destination,
				fromAddress,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});

			expect(transfer1155Spy).toHaveBeenCalledOnce();
			expect(transfer721Spy).not.toHaveBeenCalled();

			expect(transfer1155Spy).toHaveBeenCalledWith(
				expect.objectContaining({
					contractAddress: token1155.address,
					id: tokenId,
					amount: 1n, // fixed amount
					sourceNetwork: token1155.network,
					from: fromAddress,
					to: destination,
					identity,
					gas,
					maxFeePerGas,
					maxPriorityFeePerGas,
					progress: expect.any(Function)
				})
			);
		});

		it('signs out (nullishSignOut) and does not call transfer functions when identity is nullish', async () => {
			await sendNft({
				token: token721,
				tokenId: parseNftId(42),
				destination,
				fromAddress,
				identity: undefined, // nullish
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			});

			expect(signOutSpy).toHaveBeenCalledOnce();
			expect(transfer721Spy).not.toHaveBeenCalled();
			expect(transfer1155Spy).not.toHaveBeenCalled();
		});
	});
});
