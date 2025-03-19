import { ICP_NETWORK_ID } from '$env/networks/networks.env';
import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { EtherscanProvider as EtherscanProviderLib } from '@ethersproject/providers';
import type { MockedClass } from 'vitest';

vi.mock('@ethersproject/providers', () => {
	const provider = vi.fn();
	provider.prototype.getHistory = vi.fn().mockResolvedValue([]);
	return { EtherscanProvider: provider };
});

vi.mock('$env/rest/etherscan.env', () => ({
	ETHERSCAN_API_KEY: 'test-api-key'
}));

describe('etherscan.providers', () => {
	describe('EtherscanProvider', () => {
		const network = ETHERSCAN_NETWORK_HOMESTEAD;
		const address = mockEthAddress;
		const ETHERSCAN_API_KEY = 'test-api-key';

		const mockGetHistory = vi.fn().mockResolvedValue([]);
		const mockProvider = EtherscanProviderLib as MockedClass<typeof EtherscanProviderLib>;
		mockProvider.prototype.getHistory = mockGetHistory;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new EtherscanProvider(network);

			expect(provider).toBeDefined();
			expect(EtherscanProviderLib).toHaveBeenCalledWith(network, ETHERSCAN_API_KEY);
		});

		it('should call getHistory with correct parameters', async () => {
			mockGetHistory.mockResolvedValueOnce([]);

			const provider = new EtherscanProvider(network);

			const result = await provider.transactions({ address });

			expect(provider).toBeDefined();
			expect(mockGetHistory).toHaveBeenCalledWith(address, undefined);
			expect(result).toStrictEqual([]);
		});
	});

	describe('etherscanProviders', () => {
		it('should return the correct provider for Ethereum network', () => {
			expect(etherscanProviders(ETHEREUM_NETWORK_ID)).toBeInstanceOf(EtherscanProvider);
		});

		it('should return the correct provider for Sepolia network', () => {
			expect(etherscanProviders(SEPOLIA_NETWORK_ID)).toBeInstanceOf(EtherscanProvider);
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => etherscanProviders(ICP_NETWORK_ID)).toThrowError(
				replacePlaceholders(en.init.error.no_etherscan_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
