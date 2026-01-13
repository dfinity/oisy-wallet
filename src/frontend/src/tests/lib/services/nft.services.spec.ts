import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import * as ethNftServices from '$eth/services/nft.services';
import { loadNftsByNetwork as loadErcNftsByNetwork } from '$eth/services/nft.services';
import * as icNftServices from '$icp/services/nft.services';
import { loadNfts as loadIcNfts } from '$icp/services/nft.services';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import {
	loadNfts,
	loadNftsByNetwork,
	saveNftCustomToken,
	updateNftMediaConsent,
	updateNftSection
} from '$lib/services/nft.services';
import * as saveCustomTokens from '$lib/services/save-custom-tokens.services';
import { nftStore } from '$lib/stores/nft.store';
import type { NonFungibleToken } from '$lib/types/nft';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { NYAN_CAT_TOKEN, mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc1155Nft, mockValidErc721Nft, mockValidExtNft } from '$tests/mocks/nfts.mock';
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
			expect(loadIcNfts).not.toHaveBeenCalled();
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

			expect(loadIcNfts).not.toHaveBeenCalled();
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

			expect(loadIcNfts).not.toHaveBeenCalled();
		});

		it('should call the IC NFT loader if the network is ICP', async () => {
			await expect(
				loadNftsByNetwork({ ...mockParams, networkId: ICP_NETWORK_ID })
			).resolves.toEqual(mockIcNfts);

			expect(loadIcNfts).toHaveBeenCalledExactlyOnceWith({
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
			expect(loadIcNfts).not.toHaveBeenCalled();
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

			expect(loadIcNfts).toHaveBeenCalled();
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
		let saveSpy: MockInstance;

		const mockParams = {
			identity: mockIdentity,
			token: { ...mockValidErc721Token, enabled: true },
			$ethAddress: mockEthAddress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			saveSpy = vi.spyOn(saveCustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
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

			expect(saveSpy).not.toHaveBeenCalled();
		});

		it('should save an ERC721 custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidErc721Token, enabled: true }
			});

			expect(saveSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						...mockValidErc721Token,
						chainId: mockValidErc721Token.network.chainId,
						networkKey: 'Erc721',
						enabled: true
					}
				]
			});
		});

		it('should save an ERC1155 custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidErc1155Token, enabled: true }
			});

			expect(saveSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						...mockValidErc1155Token,
						chainId: mockValidErc1155Token.network.chainId,
						networkKey: 'Erc1155',
						enabled: true
					}
				]
			});
		});

		it('should save an EXT custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidExtV2Token, enabled: true }
			});

			expect(saveSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						...mockValidExtV2Token,
						networkKey: 'ExtV2',
						enabled: true
					}
				]
			});
		});

		it('should save an ICPunks custom token', async () => {
			await saveNftCustomToken({
				...mockParams,
				token: { ...mockValidIcPunksToken, enabled: true }
			});

			expect(saveSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						...mockValidIcPunksToken,
						networkKey: 'IcPunks',
						enabled: true
					}
				]
			});
		});

		it.todo('should load NFT');
	});

	describe('updateNftSection', () => {
		let saveSpy: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			saveSpy = vi.spyOn(saveCustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
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
			standard: { code: 'erc721' },
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
			standard: { code: 'erc1155' },
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

			expect(saveSpy).not.toHaveBeenCalled();
		});

		it('updates ERC721 token with section=HIDDEN (should disable allowExternalContentSource if allowExternalContentSoure is undefined)', async () => {
			await updateNftSection({
				section: CustomTokenSection.HIDDEN,
				token: base721,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						chainId: base721.network.chainId,
						networkKey: 'Erc721',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						chainId: base721.network.chainId,
						networkKey: 'Erc721',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						chainId: base721.network.chainId,
						networkKey: 'Erc721',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						chainId: base1155.network.chainId,
						networkKey: 'Erc1155',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						chainId: base1155.network.chainId,
						networkKey: 'Erc1155',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						chainId: base1155.network.chainId,
						networkKey: 'Erc1155',
						enabled: true,
						section: CustomTokenSection.SPAM,
						allowExternalContentSource: false
					}
				]
			});
		});
	});

	describe('updateNftMediaConsent', () => {
		let saveSpy: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			saveSpy = vi.spyOn(saveCustomTokens, 'saveCustomTokens').mockResolvedValue(undefined);
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
			standard: { code: 'erc721' },
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
			standard: { code: 'erc1155' },
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

			expect(saveSpy).not.toHaveBeenCalled();
		});

		it('updates ERC721 token with allowExternalContentSource=true', async () => {
			await updateNftMediaConsent({
				allowMedia: true,
				token: base721,
				$authIdentity: mockIdentity,
				$ethAddress: mockEthAddress
			});

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						chainId: base721.network.chainId,
						networkKey: 'Erc721',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base721,
						chainId: base721.network.chainId,
						networkKey: 'Erc721',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						chainId: base1155.network.chainId,
						networkKey: 'Erc1155',
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

			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				tokens: [
					{
						...base1155,
						chainId: base1155.network.chainId,
						networkKey: 'Erc1155',
						enabled: true,
						allowExternalContentSource: false
					}
				]
			});
		});
	});
});
