import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { sendNft } from '$eth/services/nft-send.services';
import * as nftTransferServices from '$eth/services/nft-transfer.services';
import type { NonFungibleToken } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TransactionResponse } from 'ethers/providers';

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn(),
	AlchemyProvider: vi.fn()
}));

describe('nft-send.services', () => {
	describe('sendNft', () => {
		const from = '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95';
		const to = '0x389658cb7961b6f5d0daec1cdb9df258e799acb0';

		const gas = 70_492n;
		const maxFeePerGas = 5_000_000n;
		const maxPriorityFeePerGas = 2_000_000n;

		const transfer721Spy = vi
			.spyOn(nftTransferServices, 'transferErc721')
			.mockResolvedValue({} as unknown as TransactionResponse);

		const transfer1155Spy = vi
			.spyOn(nftTransferServices, 'transferErc1155')
			.mockResolvedValue({} as unknown as TransactionResponse);

		const token721: NonFungibleToken = {
			address: from,
			category: 'custom',
			decimals: 0,
			id: parseTokenId('721'),
			name: 'My721',
			network: ETHEREUM_NETWORK,
			standard: 'erc721',
			symbol: 'MY721'
		};

		const token1155: NonFungibleToken = {
			address: from,
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
				to,
				from,
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
				from,
				to,
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
				to,
				from,
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
					from,
					to,
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
				to,
				from,
				identity: undefined, // nullish
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas
			});

			expect(transfer721Spy).not.toHaveBeenCalled();
			expect(transfer1155Spy).not.toHaveBeenCalled();
		});
	});
});
