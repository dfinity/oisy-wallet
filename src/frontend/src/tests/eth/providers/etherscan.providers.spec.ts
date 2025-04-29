import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import type {
	EtherscanProviderInternalTransaction,
	EtherscanProviderTokenTransferTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
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

		const mockFetch = vi.fn();
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

		describe('transactions method', () => {
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

			beforeEach(() => {
				// eslint-disable-next-line local-rules/prefer-object-params
				mockFetch.mockImplementation((_, { action }) =>
					action === 'txlist'
						? normalTransactions
						: action === 'txlistinternal'
							? internalTransactions
							: []
				);
			});

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

				await expect(provider.transactions({ address })).rejects.toThrow('Network error');
			});
		});

		describe('erc20Transactions method', () => {
			const mockApiResponse: EtherscanProviderTokenTransferTransaction[] = [
				{
					nonce: '1',
					gas: '21000',
					gasPrice: '20000000000',
					hash: '0x123abc',
					blockNumber: '123456',
					blockHash: '0x456def',
					timeStamp: '1697049600',
					confirmations: '10',
					from: '0xabc...',
					to: '0xdef...',
					value: '1000000000000000000',
					contractAddress: mockValidErc20Token.address,
					tokenName: mockValidErc20Token.name,
					tokenSymbol: mockValidErc20Token.symbol,
					tokenDecimal: mockValidErc20Token.decimals.toString(),
					transactionIndex: '0',
					gasUsed: '21000',
					cumulativeGasUsed: '21000',
					input: '0x'
				}
			];

			const expectedTransactions: Transaction[] = [
				{
					hash: '0x123abc',
					blockNumber: 123456,
					timestamp: 1697049600,
					from: '0xabc...',
					to: '0xdef...',
					nonce: 1,
					gasLimit: 21000n,
					gasPrice: 20000000000n,
					value: 1000000000000000000n,
					chainId: 0n
				}
			];

			beforeEach(() => {
				mockFetch.mockResolvedValue(mockApiResponse);
			});

			it('should fetch and map transactions correctly', async () => {
				const provider = new EtherscanProvider(network, chainId);

				const result = await provider.erc20Transactions({
					address: mockEthAddress,
					contract: mockValidErc20Token
				});

				expect(provider).toBeDefined();

				expect(mockFetch).toHaveBeenCalledTimes(1);

				expect(result).toStrictEqual(expectedTransactions);
			});

			it('should throw an error if the API call fails', async () => {
				const provider = new EtherscanProvider(network, chainId);
				mockFetch.mockRejectedValue(new Error('Network error'));

				await expect(
					provider.erc20Transactions({ address: mockEthAddress, contract: mockValidErc20Token })
				).rejects.toThrow('Network error');
			});
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
			expect(() => etherscanProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_etherscan_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
