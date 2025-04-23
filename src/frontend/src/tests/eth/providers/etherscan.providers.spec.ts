import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import type {
	EtherscanProviderInternalTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import {
	createMockEtherscanInternalTransactions,
	createMockEtherscanTransactions
} from '$tests/mocks/etherscan.mock';
import en from '$tests/mocks/i18n.mock';
import { EtherscanProvider as EtherscanProviderLib } from 'ethers/providers';
import type { MockedClass } from 'vitest';

vi.mock('$env/rest/etherscan.env', () => ({
	ETHERSCAN_API_KEY: 'test-api-key'
}));

describe('etherscan.providers', () => {
	describe('EtherscanProvider', () => {
		const network = ETHERSCAN_NETWORK_HOMESTEAD;
		const address = mockEthAddress;
		const ETHERSCAN_API_KEY = 'test-api-key';

		const normalTransactions: EtherscanProviderTransaction[] = createMockEtherscanTransactions(3);

		const internalTransactions: EtherscanProviderInternalTransaction[] =
			createMockEtherscanInternalTransactions(5);

		const expectedNormalTransactions: Transaction[] = normalTransactions.map(
			({
				blockNumber,
				timeStamp,
				hash,
				nonce,
				from,
				to,
				value,
				gas,
				gasPrice
			}: EtherscanProviderTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0n
			})
		);

		const expectedInternalTransactions: Transaction[] = internalTransactions.map(
			({
				blockNumber,
				timeStamp,
				hash,
				from,
				to,
				value,
				gas
			}: EtherscanProviderInternalTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: 0,
				gasLimit: BigInt(gas),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0n
			})
		);

		const expectedTransactions: Transaction[] = [
			...expectedNormalTransactions,
			...expectedInternalTransactions
		];

		const mockFetch = vi
			.fn()
			// eslint-disable-next-line local-rules/prefer-object-params
			.mockImplementation((_, { action }) =>
				action === 'txlist'
					? normalTransactions
					: action === 'txlistinternal'
						? internalTransactions
						: []
			);
		const mockProvider = EtherscanProviderLib as MockedClass<typeof EtherscanProviderLib>;
		mockProvider.prototype.fetch = mockFetch;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new EtherscanProvider(network);

			expect(provider).toBeDefined();
			expect(EtherscanProviderLib).toHaveBeenCalledWith(network, ETHERSCAN_API_KEY);
		});

		it('should call fetch for all history types', async () => {
			const provider = new EtherscanProvider(network);

			const result = await provider.transactions({ address });

			expect(provider).toBeDefined();

			expect(mockFetch).toHaveBeenCalledTimes(2);

			expect(result).toStrictEqual(expectedTransactions);
		});

		it('should call fetch with correct parameters for getHistory', async () => {
			const provider = new EtherscanProvider(network);

			await provider.transactions({ address });

			expect(provider).toBeDefined();

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(mockFetch).toHaveBeenNthCalledWith(1, 'account', {
				action: 'txlist',
				address,
				startblock: 0,
				endblock: 99999999,
				sort: 'asc'
			});
		});

		it('should call fetch with correct parameters for getInternalHistory', async () => {
			const provider = new EtherscanProvider(network);

			await provider.transactions({ address });

			expect(provider).toBeDefined();

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(mockFetch).toHaveBeenNthCalledWith(2, 'account', {
				action: 'txlistinternal',
				address,
				startblock: 0,
				endblock: 99999999,
				sort: 'asc'
			});
		});

		it('should handle errors gracefully', async () => {
			const provider = new EtherscanProvider(network);
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(provider.transactions({ address })).rejects.toThrowError('Network error');
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
