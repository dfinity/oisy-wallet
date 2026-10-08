import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import { InfuraProvider, infuraProviders } from '$eth/providers/infura.providers';
import type { GetFeeData } from '$eth/types/infura';
import type { EthereumNetwork } from '$eth/types/network';
import {
	OP_STACK_GAS_PRICE_ORACLE_ABI,
	OP_STACK_GAS_PRICE_ORACLE_ADDRESS
} from '$evm/base/constants/base.constants';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { nonNullish } from '@dfinity/utils';
import { AbiCoder, Interface } from 'ethers/abi';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';
import { makeError } from 'ethers/utils';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('infura.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		// The shared setup mock gives `InfuraProvider` and `JsonRpcProvider` one implementation, so
		// both transports land on this same spy. Every supported network still produces exactly one
		// call; the arguments are what say which transport it took.
		expect(InfuraProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { infura, alchemyJsonRpcUrl } }, index) => {
			if (nonNullish(infura)) {
				expect(InfuraProviderLib).toHaveBeenNthCalledWith(index + 1, infura, INFURA_API_KEY);

				return;
			}

			expect(InfuraProviderLib).toHaveBeenNthCalledWith(
				index + 1,
				expect.stringContaining(alchemyJsonRpcUrl),
				expect.anything(),
				{ staticNetwork: true }
			);
		});
	});

	describe('InfuraProvider', () => {
		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockGetTransactionCount = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockProvider.prototype.getTransactionCount = mockGetTransactionCount;
		});

		describe('getTransactionCountLatest', () => {
			const mockCount = 7;

			beforeEach(() => {
				mockGetTransactionCount.mockResolvedValue(mockCount);
			});

			it('should call getTransactionCount with the latest tag', async () => {
				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.getTransactionCountLatest(mockEthAddress)).resolves.toBe(mockCount);

				expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith(mockEthAddress, 'latest');
			});

			it('should propagate errors from the underlying provider', async () => {
				const mockError = new Error('Mock error');
				mockGetTransactionCount.mockRejectedValueOnce(mockError);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.getTransactionCountLatest(mockEthAddress)).rejects.toThrow(mockError);
			});
		});

		describe('getTransactionCountPending', () => {
			const mockCount = 11;

			beforeEach(() => {
				mockGetTransactionCount.mockResolvedValue(mockCount);
			});

			it('should call getTransactionCount with the pending tag', async () => {
				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.getTransactionCountPending(mockEthAddress)).resolves.toBe(mockCount);

				expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith(mockEthAddress, 'pending');
			});

			it('should propagate errors from the underlying provider', async () => {
				const mockError = new Error('Mock error');
				mockGetTransactionCount.mockRejectedValueOnce(mockError);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.getTransactionCountPending(mockEthAddress)).rejects.toThrow(
					mockError
				);
			});
		});

		describe('safeEstimateGas', () => {
			const mockEstimateGas = vi.fn();

			const recipient = '0x8ba1f109551bd432803012645ac136ddd64dba72';

			const data = new Interface(ERC20_ABI).encodeFunctionData('transfer', [
				recipient,
				100_000_000n
			]);

			const transaction: GetFeeData = { from: mockEthAddress3, to: USDC_TOKEN.address, data };

			const balance = '1234567890123';

			// Written by the contract, which can build it from the caller's address and balance.
			const reason = `account ${mockEthAddress3} holds ${balance}`;

			beforeEach(() => {
				mockProvider.prototype.estimateGas = mockEstimateGas;
			});

			it('should return the estimate without tracking an event', async () => {
				mockEstimateGas.mockResolvedValueOnce(21_000n);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.safeEstimateGas(transaction)).resolves.toBe(21_000n);

				expect(mockEstimateGas).toHaveBeenCalledExactlyOnceWith(transaction);
				expect(trackEvent).not.toHaveBeenCalled();
			});

			// The errors ethers makes of a node's answer to `eth_estimateGas`, built the way
			// `JsonRpcApiProvider.getRpcError` builds them.
			it.each([
				{
					answer: 'a revert without data',
					err: AbiCoder.getBuiltinCallException('estimateGas', transaction, null),
					tracked: 'CALL_EXCEPTION'
				},
				{
					answer: 'a reason naming address and balance',
					err: AbiCoder.getBuiltinCallException(
						'estimateGas',
						transaction,
						new Interface([]).encodeErrorResult('Error', [reason])
					),
					tracked: 'CALL_EXCEPTION'
				},
				{
					answer: 'insufficient funds',
					err: makeError('insufficient funds', 'INSUFFICIENT_FUNDS', {
						transaction,
						info: {
							payload: { method: 'eth_estimateGas', params: [transaction], id: 1, jsonrpc: '2.0' },
							error: {
								code: -32000,
								message: `insufficient funds for gas * price + value: address ${mockEthAddress3} have ${balance} want 9876543210987`
							}
						}
					}),
					tracked: 'INSUFFICIENT_FUNDS'
				}
			])('should track only the ethers code for $answer', async ({ err, tracked }) => {
				mockEstimateGas.mockRejectedValueOnce(err);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.safeEstimateGas(transaction)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_ETH_ESTIMATE_GAS_ERROR,
					metadata: { error: tracked, network: 'mainnet' },
					warning: `Error estimating gas for network mainnet: ${err}`
				});

				const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;
				const trackedText = JSON.stringify(metadata).toLowerCase();

				// Ethers checksums the addresses it prints, and calldata carries them without the prefix.
				[transaction.from, recipient, data].forEach((hex) => {
					const value = hex.slice(2).toLowerCase();

					expect(`${err}`.toLowerCase()).toContain(value);
					expect(trackedText).not.toContain(value);
				});

				expect(trackedText).not.toContain(balance);
			});

			it('should keep the text of an error that does not come from ethers', async () => {
				// What the browser's `fetch` throws without a connection; ethers passes it on unchanged.
				const err = new TypeError('Failed to fetch');
				mockEstimateGas.mockRejectedValueOnce(err);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.safeEstimateGas(transaction)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_ETH_ESTIMATE_GAS_ERROR,
					metadata: { error: 'TypeError: Failed to fetch', network: 'mainnet' },
					warning: 'Error estimating gas for network mainnet: TypeError: Failed to fetch'
				});
			});
		});
	});

	describe('getL1FeeUpperBound', () => {
		const mockGetL1FeeUpperBound = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(Contract).prototype.getL1FeeUpperBound =
				mockGetL1FeeUpperBound as unknown as typeof Contract.prototype.getL1FeeUpperBound;
		});

		it('should quote the GasPriceOracle predeploy for the given transaction size', async () => {
			mockGetL1FeeUpperBound.mockResolvedValue(875_004_002n);

			const provider = new InfuraProvider(ETHEREUM_NETWORK);

			await expect(provider.getL1FeeUpperBound(128n)).resolves.toBe(875_004_002n);

			expect(Contract).toHaveBeenCalledExactlyOnceWith(
				OP_STACK_GAS_PRICE_ORACLE_ADDRESS,
				OP_STACK_GAS_PRICE_ORACLE_ABI,
				expect.anything()
			);
			expect(mockGetL1FeeUpperBound).toHaveBeenCalledExactlyOnceWith(128n);
		});
	});

	describe('infuraProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = infuraProviders(id);

				expect(provider).toBeInstanceOf(InfuraProvider);

				expect(provider).toHaveProperty('network');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => infuraProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_infura_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
