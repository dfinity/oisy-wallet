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

// `ethers/utils` is not mocked globally (unlike `ethers/providers`), so the fallback's real
// request-building runs here; only the transport is swapped out, to capture the URL it targets.
const { mockFetchRequest, mockSend, requestedUrls, requests } = vi.hoisted(() => {
	const requestedUrls: string[] = [];
	const mockSend = vi.fn();
	// A class, not a function: the production code does `new FetchRequest(...)`, and the repo's
	// eslint autofix rewrites plain functions into arrows, which are not constructible — so a
	// function here silently stops working the next time `npm run format` runs.
	// Instances are captured so a test can pull the `processFunc` the code under test assigned
	// and run it against a canned response, exactly as `FetchRequest.send` would.
	const requests: { processFunc?: (req: unknown, response: unknown) => Promise<unknown> }[] = [];

	const mockFetchRequest = vi.fn(
		class {
			setThrottleParams = vi.fn();
			send = mockSend;
			// Declared so the instance satisfies the captured type; the code under test assigns it.
			processFunc?: (req: unknown, response: unknown) => Promise<unknown>;

			constructor(url: string) {
				requestedUrls.push(url);
				requests.push(this);
			}
		}
	);

	return { mockFetchRequest, mockSend, requestedUrls, requests };
});

vi.mock('ethers/utils', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	FetchRequest: mockFetchRequest
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

	// The library's *real* constructor never runs under Vitest — `vitest.setup.ts` mocks
	// `ethers/providers` for the whole suite, because the real module imports `ws`, which does not
	// load here. So the one thing these tests cannot prove is that ethers genuinely rejects a given
	// chain id; only `npm run build` does that, by evaluating the eagerly-built registry during SSR
	// prerender. Everything the fallback itself does is exercised below, by making the mocked
	// constructor throw the way the real one would.
	describe('Etherscan v2 fallback for a chain ethers does not list', () => {
		// Only has to differ from the chains ethers lists; 4663 is the case that motivated this.
		const unlistedChainId = 4663n;
		const unlistedNetwork = new Network('Unlisted Chain', unlistedChainId);

		// Classes for the same reason as the `FetchRequest` stub above: these are reached via
		// `new`, and an arrow would fail as "not a constructor" before ever throwing what we want.
		const rejectUnlistedChain = () => {
			vi.mocked(EtherscanProviderLib).mockImplementationOnce(
				class {
					constructor() {
						throw Object.assign(new Error('unsupported network'), {
							code: 'INVALID_ARGUMENT'
						});
					}
				} as unknown as typeof EtherscanProviderLib
			);
		};

		const respondWith = (body: Record<string, unknown>) => {
			mockSend.mockResolvedValue({ assertOk: vi.fn(), bodyJson: body });
		};

		// The sibling suite assigns `prototype.fetch` once at collection time and relies on it, so
		// anything set here has to be put back.
		let originalPrototypeFetch: unknown;

		beforeEach(() => {
			vi.clearAllMocks();
			requestedUrls.length = 0;
			requests.length = 0;
			originalPrototypeFetch = vi.mocked(EtherscanProviderLib).prototype.fetch;
		});

		afterEach(() => {
			vi.mocked(EtherscanProviderLib).prototype.fetch =
				originalPrototypeFetch as typeof EtherscanProviderLib.prototype.fetch;
		});

		it('should target the shared v2 endpoint with the chain id as a parameter', async () => {
			rejectUnlistedChain();
			respondWith({ status: '1', message: 'OK', result: [] });

			const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

			await provider.transactions({ address: mockEthAddress });

			expect(requestedUrls[0]).toContain('https://api.etherscan.io/v2/api?chainid=4663');
			expect(requestedUrls[0]).toContain('module=account');
			expect(requestedUrls[0]).toContain('action=txlist');
			expect(requestedUrls[0]).toContain(`address=${mockEthAddress}`);
			expect(requestedUrls[0]).toContain(`apikey=${ETHERSCAN_API_KEY}`);
		});

		it('should omit nullish parameters from the query', async () => {
			rejectUnlistedChain();
			respondWith({ status: '1', message: 'OK', result: [] });

			const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

			// `endBlock` is not supplied, so `endblock` must be absent rather than `undefined`.
			await provider.transactions({ address: mockEthAddress });

			expect(requestedUrls[0]).not.toContain('endblock');
			expect(requestedUrls[0]).not.toContain('undefined');
		});

		// Etherscan reports an empty history as `status: 0` with a distinguishing message. Ethers
		// treats those as success, and so must the fallback — otherwise a wallet with no activity
		// on the chain sees an error instead of an empty list.
		it.each(['No transactions found', 'No records found'])(
			'should treat "%s" as an empty result rather than an error',
			async (message) => {
				rejectUnlistedChain();
				respondWith({ status: '0', message, result: [] });

				const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

				await expect(provider.transactions({ address: mockEthAddress })).resolves.toEqual([]);
			}
		);

		// Etherscan answers a throttled request with **HTTP 200** and a rate-limit string in
		// `result`, so nothing below `send()` would notice: the status check would turn a
		// retryable condition into a hard failure, and history would break on this chain whenever
		// the shared key is busy — while every other chain quietly retries. The library solves
		// this in `processFunc`, and the fallback has to mirror it rather than inherit it.
		it('should turn a rate-limit payload into a retry rather than an error', async () => {
			rejectUnlistedChain();
			respondWith({ status: '1', message: 'OK', result: [] });

			const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

			await provider.transactions({ address: mockEthAddress });

			expect(requests[0].processFunc).toBeDefined();

			const throwThrottleError = vi.fn();
			const throttled = {
				hasBody: () => true,
				bodyJson: { status: '0', message: 'NOTOK', result: 'Max rate limit reached' },
				throwThrottleError
			};

			await requests[0].processFunc?.(undefined, throttled);

			// 2000ms mirrors the library's own `THROTTLE`; `FetchRequest` handles the resulting
			// error itself and stalls for that long before retrying.
			expect(throwThrottleError).toHaveBeenCalledExactlyOnceWith('Max rate limit reached', 2000);
		});

		it('should leave a normal response untouched in the response processor', async () => {
			rejectUnlistedChain();
			respondWith({ status: '1', message: 'OK', result: [] });

			const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

			await provider.transactions({ address: mockEthAddress });

			const throwThrottleError = vi.fn();
			const ok = {
				hasBody: () => true,
				bodyJson: { status: '1', message: 'OK', result: [] },
				throwThrottleError
			};

			await expect(requests[0].processFunc?.(undefined, ok)).resolves.toBe(ok);

			expect(throwThrottleError).not.toHaveBeenCalled();
		});

		it('should throw on a genuine error response', async () => {
			rejectUnlistedChain();
			respondWith({ status: '0', message: 'NOTOK', result: 'Invalid API Key' });

			const provider = new EtherscanProvider(unlistedNetwork, unlistedChainId);

			await expect(provider.transactions({ address: mockEthAddress })).rejects.toThrow(
				'Etherscan error response: NOTOK Invalid API Key'
			);
		});

		// The library is the default path, and only the unsupported-network assert may divert to
		// the fallback. Anything else is a real fault and must not be silently swallowed.
		it('should rethrow a construction error that is not the unsupported-network assert', () => {
			vi.mocked(EtherscanProviderLib).mockImplementationOnce(
				class {
					constructor() {
						throw new Error('boom');
					}
				} as unknown as typeof EtherscanProviderLib
			);

			expect(() => new EtherscanProvider(unlistedNetwork, unlistedChainId)).toThrow('boom');
		});

		it('should not use the fallback for a chain ethers does list', async () => {
			const mockLibFetch = vi.fn().mockResolvedValue([]);
			vi.mocked(EtherscanProviderLib).prototype.fetch = mockLibFetch;

			const provider = new EtherscanProvider(
				new Network(ETHEREUM_NETWORK.name, ETHEREUM_NETWORK.chainId),
				ETHEREUM_NETWORK.chainId
			);

			await provider.transactions({ address: mockEthAddress });

			expect(mockLibFetch).toHaveBeenCalled();
			expect(requestedUrls).toHaveLength(0);
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
					gasPrice,
					gasUsed,
					input: data
				}: EtherscanProviderTransaction): Transaction => ({
					hash,
					blockNumber: parseInt(blockNumber),
					timestamp: parseInt(timeStamp),
					from,
					to,
					nonce: parseInt(nonce),
					gasLimit: BigInt(gas),
					gasPrice: BigInt(gasPrice),
					gasUsed: BigInt(gasUsed),
					value: BigInt(value),
					chainId,
					data
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
					gas,
					input: data
				}: EtherscanProviderInternalTransaction): Transaction => ({
					hash,
					blockNumber: parseInt(blockNumber),
					timestamp: parseInt(timeStamp),
					from,
					to,
					nonce: 0,
					gasLimit: BigInt(gas),
					value: BigInt(value),
					chainId,
					data
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
						gasUsed: 21000n,
						value: 1000000000000000000n,
						chainId,
						data: '0x'
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
						gasUsed: 21000n,
						value: BigInt(1),
						tokenId: 132,
						chainId,
						data: '0x'
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
						gasUsed: 21000n,
						value: BigInt(3),
						tokenId: 132,
						chainId,
						data: '0x'
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

			const expectedTokenIds = ['1', '2', '3'];

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
