import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import * as erc1155CustomTokens from '$eth/services/erc1155-custom-tokens.services';
import * as erc721CustomTokens from '$eth/services/erc721-custom-tokens.services';
import * as nftSendServices from '$eth/services/nft-send.services';
import * as ethNftServices from '$eth/services/nft.services';
import { loadNftsByNetwork as loadErcNftsByNetwork } from '$eth/services/nft.services';
import * as extCustomTokens from '$icp/services/ext-custom-tokens.services';
import * as icNftServices from '$icp/services/nft.services';
import { loadNfts as loadExtNfts } from '$icp/services/nft.services';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import {
	loadNfts,
	loadNftsByNetwork,
	saveNftCustomToken,
	sendNft,
	updateNftMediaConsent,
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
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc1155Nft, mockValidErc721Nft, mockValidExtNft } from '$tests/mocks/nfts.mock';
import { type TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(),
	AlchemyProvider: vi.fn()
}));

describe('nft.services', () => {
	describe('loadNftsByNetwork', () => {
		const mockEthNfts = [mockValidErc721Nft, mockValidErc1155Nft];
		const mockIcNfts = [mockValidExtNft];

		const mockTokens = [mockValidExtV2Token, mockValidErc721Token, mockValidErc1155Token];

		const mockParams = {
			networkId: BTC_MAINNET_NETWORK_ID,
			tokens: mockTokens,
			identity: mockIdentity,
			ethAddress: mockEthAddress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockResolvedValue(mockEthNfts);
			vi.spyOn(icNftServices, 'loadNfts').mockResolvedValue(mockIcNfts);
		});

		it('should return an empty array if no tokens were provided', async () => {
			await expect(loadNftsByNetwork({ ...mockParams, tokens: [] })).resolves.toEqual([]);

			expect(loadErcNftsByNetwork).not.toHaveBeenCalled();
			expect(loadExtNfts).not.toHaveBeenCalled();
		});

		it('should call the ETH NFT loader if the network is Ethereum', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: ETHEREUM_NETWORK_ID })
			).resolves.toEqual(mockEthNfts);

			expect(loadErcNftsByNetwork).toHaveBeenCalledExactlyOnceWith({
				networkId: ETHEREUM_NETWORK_ID,
				tokens: mockTokens,
				walletAddress: mockEthAddress
			});

			expect(loadExtNfts).not.toHaveBeenCalled();
		});

		it('should call the ETH NFT loader if the network is EVM', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: BASE_NETWORK_ID })
			).resolves.toEqual(mockEthNfts);

			expect(loadErcNftsByNetwork).toHaveBeenCalledExactlyOnceWith({
				networkId: BASE_NETWORK_ID,
				tokens: mockTokens,
				walletAddress: mockEthAddress
			});

			expect(loadExtNfts).not.toHaveBeenCalled();
		});

		it('should call the IC NFT loader if the network is ICP', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: ICP_NETWORK_ID })
			).resolves.toEqual(mockIcNfts);

			expect(loadExtNfts).toHaveBeenCalledExactlyOnceWith({
				tokens: mockTokens,
				identity: mockIdentity
			});

			expect(loadErcNftsByNetwork).not.toHaveBeenCalled();
		});

		it('should return an empty array for an unmapped network', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: SOLANA_MAINNET_NETWORK_ID })
			).resolves.toEqual([]);
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: BTC_MAINNET_NETWORK_ID })
			).resolves.toEqual([]);

			expect(loadErcNftsByNetwork).not.toHaveBeenCalled();
			expect(loadExtNfts).not.toHaveBeenCalled();
		});
	});

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
		const mockNft4 = {
			...mockValidExtNft,
			id: parseNftId('1111'),
			collection: mockValidExtNft.collection
		};
		const mockNft5 = {
			...mockValidExtNft,
			id: parseNftId('2222'),
			collection: mockValidExtNft.collection
		};

		const erc721AzukiToken = { ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true };
		const erc1155NyanCatToken = { ...NYAN_CAT_TOKEN, version: BigInt(1), enabled: true };
		const mockWalletAddress = mockEthAddress;

		beforeEach(() => {
			vi.clearAllMocks();

			nftStore.resetAll();

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockResolvedValue([]);
			vi.spyOn(icNftServices, 'loadNfts').mockResolvedValue([]);
		});

		it('should not load NFTs if no tokens were provided', async () => {
			const tokens: NonFungibleToken[] = [];

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(ethNftServices.loadNftsByNetwork).not.toHaveBeenCalled();
			expect(icNftServices.loadNfts).not.toHaveBeenCalled();
		});

		it('should load ERC721 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc721AzukiToken];

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockResolvedValue([mockNft1, mockNft2]);

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft1, mockNft2]);
		});

		it('should load ERC1155 NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockResolvedValue([mockNft3]);

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft3]);
		});

		it('should load EXT NFTs', async () => {
			const tokens: NonFungibleToken[] = [mockValidExtV2Token];

			vi.spyOn(icNftServices, 'loadNfts').mockResolvedValue([mockNft4, mockNft5]);

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft4, mockNft5]);
		});

		it('should handle ERC NFTs loading error gracefully', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockRejectedValueOnce(new Error('NFTs Error'));

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(loadErcNftsByNetwork).toHaveBeenCalled();
			expect(get(nftStore)).toBeUndefined();
		});

		it('should handle EXT NFTs loading error gracefully', async () => {
			const tokens: NonFungibleToken[] = [mockValidExtV2Token];

			vi.spyOn(icNftServices, 'loadNfts').mockRejectedValueOnce(new Error('NFTs Error'));

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(loadExtNfts).toHaveBeenCalled();
			expect(get(nftStore)).toBeUndefined();
		});

		it('should re-load NFTs', async () => {
			const tokens: NonFungibleToken[] = [erc1155NyanCatToken];

			vi.spyOn(ethNftServices, 'loadNftsByNetwork').mockResolvedValueOnce([mockNft3]);
			vi.spyOn(nftsUtils, 'findNftsByToken').mockReturnValueOnce([]);

			await loadNfts({ tokens, identity: mockIdentity, ethAddress: mockWalletAddress });

			expect(get(nftStore)).toEqual([mockNft3]);
		});
	});

	describe('saveNftCustomToken', () => {
		let erc721Spy: MockInstance;
		let erc1155Spy: MockInstance;
		let extSpy: MockInstance;

		const mockParams = {
			identity: mockIdentity,
			token: { ...mockValidErc721Token, enabled: true },
			$ethAddress: mockEthAddress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			erc721Spy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
			erc1155Spy = vi.spyOn(erc1155CustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
			extSpy = vi.spyOn(extCustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
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
			expect(extSpy).not.toHaveBeenCalled();
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
			expect(extSpy).not.toHaveBeenCalled();
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
			expect(extSpy).not.toHaveBeenCalled();
		});

		it('should save an EXT custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidExtV2Token, enabled: true }
			});

			expect(erc721Spy).not.toHaveBeenCalled();
			expect(erc1155Spy).not.toHaveBeenCalled();
			expect(extSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [{ ...mockValidExtV2Token, enabled: true }]
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

	describe('updateNftMediaConsent', () => {
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
			await updateNftMediaConsent({
				allowMedia: true,
				token: base721,
				$authIdentity: null,
				$ethAddress: mockEthAddress
			});

			expect(erc721Spy).not.toHaveBeenCalled();
			expect(erc1155Spy).not.toHaveBeenCalled();
		});

		it('updates ERC721 token with allowExternalContentSource=true', async () => {
			await updateNftMediaConsent({
				allowMedia: true,
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
						allowExternalContentSource: true
					}
				]
			});
		});

		it('updates ERC721 token with allowExternalContentSource=false', async () => {
			await updateNftMediaConsent({
				allowMedia: false,
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
						allowExternalContentSource: false
					}
				]
			});
		});

		it('updates ERC1155 token with allowExternalContentSource=true', async () => {
			await updateNftMediaConsent({
				allowMedia: true,
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
						allowExternalContentSource: true
					}
				]
			});
		});

		it('updates ERC1155 token with allowExternalContentSource=false', async () => {
			await updateNftMediaConsent({
				allowMedia: false,
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
						allowExternalContentSource: false
					}
				]
			});
		});
	});
});
