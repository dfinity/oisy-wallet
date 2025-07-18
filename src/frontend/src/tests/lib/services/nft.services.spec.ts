import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { loadNfts } from '$lib/services/nft.services';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Nft } from '$lib/types/nft';
import { type EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import { Network } from 'ethers/providers';

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn(),
	EtherscanProvider: vi.fn()
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

	describe('loadNfts', () => {
		const mockWalletAddress = mockEthAddress;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(etherscanProviders).mockReturnValue(mockEtherscanProvider);
		});

		it('should not load NFTs if no tokens were provided', () => {
			const tokens: Erc721CustomToken[] = [];
			const loadedNftsByToken = new Map<string, Nft[]>();

			loadNfts({ tokens, loadedNftsByToken, walletAddress: mockWalletAddress });

			expect(mockEtherscanProvider.erc721TokenInventory).not.toHaveBeenCalled();
		});










		});
});