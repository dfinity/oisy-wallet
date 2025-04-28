import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import type {
	EtherscanProviderInternalTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { EthereumNetwork } from '$eth/types/network';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import {
	createMockEtherscanInternalTransactions,
	createMockEtherscanTransactions
} from '$tests/mocks/etherscan.mock';
import en from '$tests/mocks/i18n.mock';
import {
	EtherscanPlugin,
	EtherscanProvider as EtherscanProviderLib,
	Network
} from 'ethers/providers';
import { type MockedClass } from 'vitest';

vi.mock('$env/rest/etherscan.env', () => ({
	ETHERSCAN_API_KEY: 'test-api-key'
}));

describe('etherscan.providers', () => {
	const ETHERSCAN_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [
		ETHEREUM_NETWORK,
		SEPOLIA_NETWORK,
		BASE_NETWORK,
		BASE_SEPOLIA_NETWORK,
		BSC_MAINNET_NETWORK,
		BSC_TESTNET_NETWORK
	];

	it('should create the correct map of providers', () => {
		expect(EtherscanProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ name, chainId }, index) => {
			expect(EtherscanProviderLib).toHaveBeenNthCalledWith(
				index + 1,
				new Network(name, chainId),
				ETHERSCAN_API_KEY
			);
		});
	});

	it('should attach the custom plugin to the providers', () => {
		const ETHERSCAN_PLUGIN = new EtherscanPlugin('https://api.etherscan.io/v2');

		expect(Network.prototype.attachPlugin).toHaveBeenCalledTimes(networks.length);

		networks.forEach((_, index) => {
			expect(Network.prototype.attachPlugin).toHaveBeenNthCalledWith(index + 1, ETHERSCAN_PLUGIN);
		});
	});

	describe('EtherscanProvider', () => {
		const network: Network = new Network(ETHEREUM_NETWORK.name, ETHEREUM_NETWORK.chainId);
		const chainId = ETHEREUM_NETWORK.chainId;
		const address = mockEthAddress;

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
				chainId
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
				chainId
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
			const provider = new EtherscanProvider(network, chainId);

			expect(provider).toBeDefined();
			expect(EtherscanProviderLib).toHaveBeenCalledWith(network, ETHERSCAN_API_KEY);
		});

		describe('transactions method', () => {
			it('should call fetch for all history types', async () => {
				const provider = new EtherscanProvider(network, chainId);

				const result = await provider.transactions({ address });

				expect(provider).toBeDefined();

				expect(mockFetch).toHaveBeenCalledTimes(2);

				expect(result).toStrictEqual(expectedTransactions);
			});

			it('should call fetch with correct parameters for getHistory', async () => {
				const provider = new EtherscanProvider(network, chainId);

				await provider.transactions({ address });

				expect(provider).toBeDefined();

				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect(mockFetch).toHaveBeenNthCalledWith(1, 'account', {
					chainId,
					action: 'txlist',
					address,
					startblock: 0,
					endblock: 99999999,
					sort: 'asc'
				});
			});

			it('should call fetch with correct parameters for getInternalHistory', async () => {
				const provider = new EtherscanProvider(network, chainId);

				await provider.transactions({ address });

				expect(provider).toBeDefined();

				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect(mockFetch).toHaveBeenNthCalledWith(2, 'account', {
					chainId,
					action: 'txlistinternal',
					address,
					startblock: 0,
					endblock: 99999999,
					sort: 'asc'
				});
			});

			it('should handle errors gracefully', async () => {
				const provider = new EtherscanProvider(network, chainId);
				mockFetch.mockRejectedValue(new Error('Network error'));

				await expect(provider.transactions({ address })).rejects.toThrow('Network error');
			});
		});
	});

	describe('etherscanProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = etherscanProviders(id);

				expect(provider).toBeInstanceOf(EtherscanProvider);

				expect(provider).toHaveProperty('network');
				expect(provider).toHaveProperty('chainId');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => etherscanProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_etherscan_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
