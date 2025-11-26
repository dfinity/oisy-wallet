import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as erc1155CustomTokens from '$eth/services/erc1155-custom-tokens.services';
import * as erc721CustomTokens from '$eth/services/erc721-custom-tokens.services';
import * as nftSendServices from '$eth/services/nft-send.services';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import {
	loadNfts,
	saveNftCustomToken,
	sendNft,
	updateNftSection
} from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import type { NonFungibleToken } from '$lib/types/nft';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { NYAN_CAT_TOKEN, mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { Network, type TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

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
			id: parseNftId('123'),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft2 = {
			...mockValidErc721Nft,
			id: parseNftId('321'),
			collection: {
				...mockValidErc721Nft.collection,
				address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
				network: AZUKI_ELEMENTAL_BEANS_TOKEN.network
			}
		};
		const mockNft3 = {
			...mockValidErc1155Nft,
			id: parseNftId('876'),
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

		it('should re-load NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.mocked(mockAlchemyProvider.getNftsByOwner).mockResolvedValueOnce([mockNft3]);
			vi.spyOn(nftsUtils, 'findNftsByToken').mockReturnValueOnce([]);

			await loadNfts({ tokens, walletAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft3]);
		});
	});

	describe('saveNftCustomToken', () => {
		let erc721Spy: MockInstance;
		let erc1155Spy: MockInstance;

		const mockParams = {
			identity: mockIdentity,
			token: { ...mockValidErc721Token, enabled: true },
			$ethAddress: mockEthAddress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			erc721Spy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
			erc1155Spy = vi.spyOn(erc1155CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
		});

		it('should return early if identity is nullish', async () => {
			await saveNftCustomToken({
				...mockParams,
				identity: undefined
			});

			await saveNftCustomToken({
				...mockParams,
				identity: null
			});

			expect(erc721Spy).not.toHaveBeenCalled();
			expect(erc1155Spy).not.toHaveBeenCalled();
		});

		it('should save an ERC721 custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidErc721Token, enabled: true }
			});

			expect(erc721Spy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [{ ...mockValidErc721Token, enabled: true }]
			});
			expect(erc1155Spy).not.toHaveBeenCalled();
		});

		it('should save an ERC1155 custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidErc1155Token, enabled: true }
			});

			expect(erc721Spy).not.toHaveBeenCalled();
			expect(erc1155Spy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [{ ...mockValidErc1155Token, enabled: true }]
			});
		});

		it.todo('should load NFT');
	});

	describe('sendNft', () => {
		const fromAddress = '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95';
		const toAddress = '0x389658cb7961b6f5d0daec1cdb9df258e799acb0';

		const gas = 70_492n;
		const maxFeePerGas = 5_000_000n;
		const maxPriorityFeePerGas = 2_000_000n;

		const transfer721Spy = vi
			.spyOn(nftSendServices, 'transferErc721')
			.mockResolvedValue({} as unknown as TransactionResponse);

		const transfer1155Spy = vi
			.spyOn(nftSendServices, 'transferErc1155')
			.mockResolvedValue({} as unknown as TransactionResponse);

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
			const tokenId = parseNftId('1');

			const progress = vi.fn();

			await sendNft({
				token: token721,
				tokenId,
				toAddress,
				fromAddress,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});

			expect(transfer721Spy).toHaveBeenCalledExactlyOnceWith({
				contractAddress: token721.address,
				tokenId,
				sourceNetwork: token721.network,
				from: fromAddress,
				to: toAddress,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
			expect(transfer1155Spy).not.toHaveBeenCalled();
		});

		it('calls transferErc1155 for an ERC-1155 token with id=tokenId and amount=1n', async () => {
			const tokenId = parseNftId('725432');
			const progress = vi.fn();

			await sendNft({
				token: token1155,
				tokenId,
				toAddress,
				fromAddress,
				identity: mockIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});

			expect(transfer1155Spy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					contractAddress: token1155.address,
					id: tokenId,
					amount: 1n, // fixed amount
					sourceNetwork: token1155.network,
					from: fromAddress,
					to: toAddress,
					identity: mockIdentity,
					gas,
					maxFeePerGas,
					maxPriorityFeePerGas,
					progress: expect.any(Function)
				})
			);
			expect(transfer721Spy).not.toHaveBeenCalled();
		});

		it('returns early and does not call transfer functions when identity is nullish', async () => {
			await sendNft({
				token: token721,
				tokenId: parseNftId('42'),
				toAddress,
				fromAddress,
				identity: undefined, // nullish
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			});

			expect(transfer721Spy).not.toHaveBeenCalled();
			expect(transfer1155Spy).not.toHaveBeenCalled();
		});
	});

	describe('updateNftSection', () => {
		let erc721Spy: MockInstance;
		let erc1155Spy: MockInstance;

		beforeEach(() => {
			erc721Spy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
			erc1155Spy = vi.spyOn(erc1155CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const base721: NonFungibleToken = {
			address: '0x111',
			category: 'custom',
			decimals: 0,
			id: parseTokenId('721'),
			name: 'My721',
			network: ETHEREUM_NETWORK,
			standard: 'erc721',
			symbol: 'MY721',
			section: undefined
		};

		const base1155: NonFungibleToken = {
			address: '0x222',
			category: 'custom',
			decimals: 0,
			id: parseTokenId('1155'),
			name: 'My1155',
			network: ETHEREUM_NETWORK,
			standard: 'erc1155',
			symbol: 'MY1155',
			section: undefined
		};

		it('does nothing if auth identity is nullish', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: base721,
				$authIdentity: null,
				$ethAddress: mockEthAddress
			});

			expect(erc721Spy).not.toHaveBeenCalled();
			expect(erc1155Spy).not.toHaveBeenCalled();
		});

		it('updates ERC721 token with section=HIDDEN (should disable allowExternalContentSource if allowExternalContentSoure is undefined)', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: base721,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc721Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						enabled: true,
						section: CustomTokenSection.HIDDEN,
						allowExternalContentSource: false
					}
				]
			});
		});

		it('updates ERC721 token with section=HIDDEN (should disable allowExternalContentSource if allowExternalContentSoure is not undefined)', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: { ...base721, allowExternalContentSource: true },
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc721Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						enabled: true,
						section: CustomTokenSection.HIDDEN,
						allowExternalContentSource: true
					}
				]
			});
		});

		it('updates ERC721 token with section=SPAM (should disable allowExternalContentSource)', async () => {
			await updateNftSection({
				section: CustomTokenSection.SPAM,
				token: base721,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc721Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						enabled: true,
						section: CustomTokenSection.SPAM,
						allowExternalContentSource: false
					}
				]
			});
		});

		it('updates ERC1155 token with section=HIDDEN (should disable allowExternalContentSource if allowExternalContentSoure is undefined)', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: base1155,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc1155Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						enabled: true,
						section: CustomTokenSection.HIDDEN,
						allowExternalContentSource: false
					}
				]
			});
		});

		it('updates ERC1155 token with section=HIDDEN (should not change allowExternalContentSource if allowExternalContentSource is not undefined)', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: { ...base1155, allowExternalContentSource: true },
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc1155Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						enabled: true,
						section: CustomTokenSection.HIDDEN,
						allowExternalContentSource: true
					}
				]
			});
		});

		it('updates ERC1155 token with section=SPAM (should disable allowExternalContentSource)', async () => {
			await updateNftSection({
				section: CustomTokenSection.SPAM,
				token: base1155,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(erc1155Spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						enabled: true,
						section: CustomTokenSection.SPAM,
						allowExternalContentSource: false
					}
				]
			});
		});
	});
});
