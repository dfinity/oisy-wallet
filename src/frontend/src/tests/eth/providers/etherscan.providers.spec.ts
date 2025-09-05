import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import type {
	EtherscanProviderErc1155TokenTransferTransaction,
	EtherscanProviderErc721TokenTransferTransaction,
	EtherscanProviderInternalTransaction,
	EtherscanProviderTokenTransferTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { EthereumNetwork } from '$eth/types/network';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import {
	createMockEtherscanInternalTransactions,
	createMockEtherscanTransactions
} from '$tests/mocks/etherscan.mock';
import en from '$tests/mocks/i18n.mock';
import { EtherscanProvider as EtherscanProviderLib, Network } from 'ethers/providers';

vi.mock('$env/rest/etherscan.env', () => ({
	ETHERSCAN_API_KEY: 'test-api-key'
}));

describe('etherscan.providers', () => {
	const ETHERSCAN_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

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

	describe('EtherscanProvider', () => {
		const network: Network = new Network(ETHEREUM_NETWORK.name, ETHEREUM_NETWORK.chainId);
		const { chainId } = ETHEREUM_NETWORK;
		const address = mockEthAddress;

		const mockFetch = vi.fn();
		const mockProvider = vi.mocked(EtherscanProviderLib);
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
				const provider = new EtherscanProvider(network, chainId);
				mockFetch.mockRejectedValue(new Error('Network error'));

				await expect(provider.transactions({ address })).rejects.toThrow('Network error');
			});

			describe('erc20Transactions', () => {
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
						chainId
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

					expect(mockFetch).toHaveBeenCalledOnce();

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

			describe('erc721Transactions', () => {
				const mockApiResponse: EtherscanProviderErc721TokenTransferTransaction[] = [
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
						tokenID: '132',
						contractAddress: mockValidErc721Token.address,
						tokenName: mockValidErc721Token.name,
						tokenSymbol: mockValidErc721Token.symbol,
						tokenDecimal: mockValidErc721Token.decimals.toString(),
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
						value: BigInt(1),
						tokenId: 132,
						chainId
					}
				];

				beforeEach(() => {
					mockFetch.mockResolvedValue(mockApiResponse);
				});

				it('should fetch and map transactions correctly', async () => {
					const provider = new EtherscanProvider(network, chainId);

					const result = await provider.erc721Transactions({
						address: mockEthAddress,
						contract: mockValidErc721Token
					});

					expect(provider).toBeDefined();

					expect(mockFetch).toHaveBeenCalledOnce();

					expect(result).toStrictEqual(expectedTransactions);
				});

				it('should throw an error if the API call fails', async () => {
					const provider = new EtherscanProvider(network, chainId);
					mockFetch.mockRejectedValue(new Error('Network error'));

					await expect(
						provider.erc721Transactions({ address: mockEthAddress, contract: mockValidErc721Token })
					).rejects.toThrow('Network error');
				});
			});

			describe('erc1155Transactions', () => {
				const mockApiResponse: EtherscanProviderErc1155TokenTransferTransaction[] = [
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
						tokenID: '132',
						tokenValue: '3',
						contractAddress: mockValidErc1155Token.address,
						tokenName: mockValidErc1155Token.name,
						tokenSymbol: mockValidErc1155Token.symbol,
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
						value: BigInt(3),
						tokenId: 132,
						chainId
					}
				];

				beforeEach(() => {
					mockFetch.mockResolvedValue(mockApiResponse);
				});

				it('should fetch and map transactions correctly', async () => {
					const provider = new EtherscanProvider(network, chainId);

					const result = await provider.erc1155Transactions({
						address: mockEthAddress,
						contract: mockValidErc1155Token
					});

					expect(provider).toBeDefined();

					expect(mockFetch).toHaveBeenCalledOnce();

					expect(result).toStrictEqual(expectedTransactions);
				});

				it('should throw an error if the API call fails', async () => {
					const provider = new EtherscanProvider(network, chainId);
					mockFetch.mockRejectedValue(new Error('Network error'));

					await expect(
						provider.erc1155Transactions({
							address: mockEthAddress,
							contract: mockValidErc1155Token
						})
					).rejects.toThrow('Network error');
				});
			});
		});

		describe('erc721TokenInventory', () => {
			const mockApiResponse = [
				{
					TokenAddress: mockEthAddress,
					TokenId: '1'
				},
				{
					TokenAddress: mockEthAddress2,
					TokenId: '2'
				},
				{
					TokenAddress: mockEthAddress3,
					TokenId: '3'
				}
			];

			const expectedTokenIds = [1, 2, 3];

			beforeEach(() => {
				vi.clearAllMocks();

				mockFetch.mockResolvedValue(mockApiResponse);
			});

			it('should fetch and map token ids correctly', async () => {
				const provider = new EtherscanProvider(network, chainId);

				const tokenIds = await provider.erc721TokenInventory({
					address: mockEthAddress,
					contractAddress: mockValidErc721Token.address
				});

				expect(mockFetch).toHaveBeenCalledOnce();

				expect(tokenIds).toStrictEqual(expectedTokenIds);
			});

			it('should throw an error if the API call fails', async () => {
				const provider = new EtherscanProvider(network, chainId);
				mockFetch.mockRejectedValue(new Error('Network error'));

				await expect(
					provider.erc721TokenInventory({
						address: mockEthAddress,
						contractAddress: mockValidErc721Token.address
					})
				).rejects.toThrow('Network error');
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
