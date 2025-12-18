import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { saveErcCustomTokens } from '$eth/services/erc-custom-tokens.services';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type { SaveCustomErc1155Variant, SaveCustomErc721Variant } from '$lib/types/custom-token';
import type { OwnedContract } from '$lib/types/nft';
import type { TokenStandardCode } from '$lib/types/token';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCustomTokensErc1155, mockCustomTokensErc721 } from '$tests/mocks/custom-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn()
}));

describe('erc-custom-tokens.services', () => {
	describe('saveErcCustomTokens', () => {
		// We need contract addresses that are not already in our mocked for the saved custom tokens
		const mockOwnedContractsErc721: OwnedContract[] = [
			{ address: '0xA245fe89Af4573Bc53f4BeA5Ae4c38db431d9123', isSpam: false, standard: 'erc721' },
			{ address: '0xa2BbA9d9AD87FAee2848516bf79C0106bdB9Ce59', isSpam: false, standard: 'erc721' }
		];
		const mockOwnedContractsErc1155: OwnedContract[] = [
			{ address: '0x206571b68c66E1d112b74d65695043ad2b5F95D5', isSpam: false, standard: 'erc1155' }
		];
		const mockOwnedContracts: OwnedContract[] = [
			...mockOwnedContractsErc721,
			...mockOwnedContractsErc1155
		];

		const mockCustomTokens = [...mockCustomTokensErc721, ...mockCustomTokensErc1155];

		const mockNetwork = ETHEREUM_NETWORK;

		const mockParams = {
			contracts: mockOwnedContracts,
			customTokens: mockCustomTokens,
			network: mockNetwork,
			identity: mockIdentity
		};

		const expectedErc721Tokens: SaveCustomErc721Variant[] = mockOwnedContractsErc721.map(
			({ address }) => ({
				address,
				chainId: mockNetwork.chainId,
				networkKey: 'Erc721',
				enabled: true
			})
		);

		const expectedErc1155Tokens: SaveCustomErc1155Variant[] = mockOwnedContractsErc1155.map(
			({ address }) => ({
				address,
				chainId: mockNetwork.chainId,
				networkKey: 'Erc1155',
				enabled: true
			})
		);

		const expectedErcTokens = [...expectedErc721Tokens, ...expectedErc1155Tokens];

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it('should save all ERC tokens for the specified network', async () => {
			await saveErcCustomTokens(mockParams);

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErcTokens,
				identity: mockIdentity
			});
		});

		it('should not save ERC721 tokens if there are none', async () => {
			await saveErcCustomTokens({ ...mockParams, contracts: mockOwnedContractsErc1155 });

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErc1155Tokens,
				identity: mockIdentity
			});
		});

		it('should not save ERC1155 tokens if there are none', async () => {
			await saveErcCustomTokens({ ...mockParams, contracts: mockOwnedContractsErc721 });

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErc721Tokens,
				identity: mockIdentity
			});
		});

		it('should not save any tokens if there are none', async () => {
			await saveErcCustomTokens({ ...mockParams, contracts: [] });

			expect(saveCustomTokens).not.toHaveBeenCalled();
		});

		it('should not save tokens that are already saved', async () => {
			assert('Erc721' in mockCustomTokensErc721[0].token);

			await saveErcCustomTokens({
				...mockParams,
				contracts: [
					...mockOwnedContracts,
					{
						address: mockCustomTokensErc721[0].token.Erc721.token_address,
						isSpam: false,
						standard: 'erc721'
					}
				]
			});

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErcTokens,
				identity: mockIdentity
			});
		});

		it('should fail if saving tokens fails', async () => {
			const mockError = new Error('Failed to save tokens');
			vi.mocked(saveCustomTokens).mockRejectedValueOnce(mockError);

			await expect(saveErcCustomTokens(mockParams)).rejects.toThrowError(mockError);

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErcTokens,
				identity: mockIdentity
			});
		});

		it('should not process non-ERC721 and non-ERC1155 tokens', async () => {
			await saveErcCustomTokens({
				...mockParams,
				contracts: [{ address: mockEthAddress, isSpam: false, standard: 'erc20' }]
			});

			expect(saveCustomTokens).not.toHaveBeenCalled();
		});

		it('should handle mixed-case standards', async () => {
			const mixedCaseContracts: OwnedContract[] = [
				{ ...mockOwnedContracts[0], standard: 'eRc721' as TokenStandardCode },
				{ ...mockOwnedContracts[1], standard: 'ERC721' as TokenStandardCode },
				{ ...mockOwnedContracts[2], standard: 'eRC1155' as TokenStandardCode }
			];

			await saveErcCustomTokens({ ...mockParams, contracts: mixedCaseContracts });

			expect(saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				tokens: expectedErcTokens,
				identity: mockIdentity
			});
		});
	});
});
