import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersLib from '$eth/providers/alchemy.providers';
import * as infuraProvidersLib from '$eth/providers/infura.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import * as ethTransactionServicesLib from '$eth/services/eth-transaction.services';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import { swap } from '$eth/services/swap.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { EthSubmissionUnconfirmedError } from '$eth/types/send';
import * as signerApiLib from '$lib/api/signer.api';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { SWAP_BROADCAST_ATTEMPTS } from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { consoleError } from '$lib/utils/console.utils';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockLifiCalldataAcrossEvm,
	mockLifiCalldataSameChain
} from '$tests/mocks/lifi-calldata.mock';
import type { TransactionParams } from '@velora-dex/sdk';
import { keccak256 } from 'ethers/crypto';
import { InfuraProvider as InfuraProviderLib, type TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

// `JsonRpcProvider` and `Network` are needed even though this suite only exercises Infura
// chains: the registry is built eagerly over every supported network, and the ones Infura does
// not host take the fallback transport. Both share one implementation, as the shared setup mock
// does — nothing here tells the two apart. `EtherscanProvider` is for the pending-activity tests,
// whose real `processTransactionSent` loads the Etherscan registry with its dependencies.
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	provider.prototype.getTransactionCount = vi.fn();
	provider.prototype.sendTransaction = vi.fn();
	return {
		InfuraProvider: provider,
		JsonRpcProvider: provider,
		EtherscanProvider: vi.fn(),
		Network: vi.fn()
	};
});

vi.mock('$eth/services/eth-transaction.services', () => ({
	processTransactionSent: vi.fn()
}));

vi.mock('$lib/api/signer.api', () => ({
	signTransaction: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitForMilliseconds: vi.fn()
}));

// What this suite tests is the swap's own retry of a broadcast. The provider asking Alchemy when
// Infura fails is tested with the provider, and left on it would answer some of the attempts here.
vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-alchemy-key',
	ALCHEMY_EVM_FALLBACK_ENABLED: false
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

describe('swap.services', () => {
	describe('swap', () => {
		const mockNonce = 42;
		const mockTransactionHash = '0x1234567890abcdef';
		const mockRawTransaction = '0xabcdef1234567890';

		const mockTransactionParams: TransactionParams = {
			data: '0x1234',
			gas: '21000',
			chainId: 1,
			value: '0',
			from: '0x001',
			to: '0x0002'
		};

		const mockSwapParams = {
			progress: vi.fn(),
			token: ETHEREUM_TOKEN,
			transaction: mockTransactionParams,
			amount: 50_000_000n,
			from: mockEthAddress,
			to: mockEthAddress2,
			sourceNetwork: ETHEREUM_NETWORK,
			identity: mockIdentity,
			maxFeePerGas: 30000000000n,
			maxPriorityFeePerGas: 2000000000n
		};

		const mockTransactionResponse: TransactionResponse = {
			hash: mockTransactionHash,
			nonce: mockNonce,
			gasLimit: 21000n,
			gasPrice: 20000000000n,
			to: mockEthAddress2,
			value: ZERO,
			data: '0x1234',
			chainId: 1,
			from: mockEthAddress,
			wait: vi.fn(),
			confirmations: 0,
			blockNumber: undefined,
			blockHash: undefined,
			timestamp: undefined,
			raw: mockRawTransaction
		} as unknown as TransactionResponse;

		const mockError = new Error('Error during swap');

		const mockGetTransactionCount = vi.fn();
		const mockSendTransaction = vi.fn();
		const mockProvider = vi.mocked(InfuraProviderLib);

		let spyGet: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyGet = vi.spyOn({ get }, 'get');
			spyGet.mockReturnValue(en);

			vi.spyOn(infuraProvidersLib, 'infuraProviders');
			vi.spyOn(ethTransactionServicesLib, 'processTransactionSent');
			vi.spyOn(signerApiLib, 'signTransaction');

			mockProvider.prototype.getTransactionCount = mockGetTransactionCount;
			mockProvider.prototype.broadcastTransaction = mockSendTransaction;
			mockGetTransactionCount.mockResolvedValue(mockNonce);
			mockSendTransaction.mockResolvedValue(mockTransactionResponse);

			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(processTransactionSent).mockResolvedValue();
		});

		it('should perform swap successfully', async () => {
			const result = await swap(mockSwapParams);

			expect(result).toEqual({ hash: mockTransactionHash, nonce: mockNonce });

			expect(infuraProviders).toHaveBeenCalled();
			expect(mockGetTransactionCount).toHaveBeenCalledOnce();

			expect(infuraProviders).toHaveBeenNthCalledWith(1, ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenNthCalledWith(1, mockEthAddress, 'pending');
		});

		it('should call progress with correct step', async () => {
			await swap(mockSwapParams);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});

		it('should call signTransaction with correct parameters', async () => {
			await swap(mockSwapParams);

			expect(signTransaction).toHaveBeenCalledOnce();
			expect(signTransaction).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: ['0x1234'],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('0')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should call sendTransaction with raw transaction', async () => {
			await swap(mockSwapParams);

			expect(mockSendTransaction).toHaveBeenCalledOnce();
			expect(mockSendTransaction).toHaveBeenNthCalledWith(1, mockRawTransaction);
		});

		it('should call processTransactionSent with correct parameters', async () => {
			await swap(mockSwapParams);

			expect(processTransactionSent).toHaveBeenCalledOnce();
			expect(processTransactionSent).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				token: ETHEREUM_TOKEN,
				transaction: mockTransactionResponse,
				value: 50_000_000n
			});
		});

		it('should resolve although the pending activity fails, which is not the swap', async () => {
			const err = new Error('transaction not found');

			vi.mocked(processTransactionSent).mockRejectedValue(err);

			await expect(swap(mockSwapParams)).resolves.toEqual({
				hash: mockTransactionHash,
				nonce: mockNonce
			});

			await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(err));
		});

		describe('a broadcast whose outcome is unknown', () => {
			// The node's answer to the broadcast, as ethers nests it.
			const nodeAnswer = (message: string) =>
				Object.assign(new Error(message), {
					code: 'UNKNOWN_ERROR',
					error: { code: -32000, message },
					payload: { id: 1, jsonrpc: '2.0', method: 'eth_sendRawTransaction' }
				});

			it.each([
				{ failure: 'a transport failure', err: new Error('fetch failed') },
				{
					failure: 'a server error',
					err: Object.assign(new Error('bad response'), { code: 'SERVER_ERROR' })
				},
				{ failure: 'an underpriced answer', err: nodeAnswer('transaction underpriced') }
			])('should send the same signed bytes again after $failure', async ({ err }) => {
				mockSendTransaction.mockRejectedValueOnce(err);

				await expect(swap(mockSwapParams)).resolves.toEqual({
					hash: mockTransactionHash,
					nonce: mockNonce
				});

				expect(signTransaction).toHaveBeenCalledOnce();
				expect(mockSendTransaction).toHaveBeenCalledTimes(2);
				expect(mockSendTransaction).toHaveBeenNthCalledWith(2, mockRawTransaction);
				expect(processTransactionSent).toHaveBeenCalledOnce();
			});

			it('should give up after the last attempt, with its failure', async () => {
				const last = new Error('fetch failed, last attempt');

				mockSendTransaction.mockRejectedValue(last);

				for (let attempt = 1; attempt < SWAP_BROADCAST_ATTEMPTS; attempt++) {
					mockSendTransaction.mockRejectedValueOnce(new Error('fetch failed'));
				}

				await expect(swap(mockSwapParams)).rejects.toThrow(last);

				expect(mockSendTransaction).toHaveBeenCalledTimes(SWAP_BROADCAST_ATTEMPTS);
				expect(processTransactionSent).not.toHaveBeenCalled();
			});

			it('should not send again after a definitive refusal', async () => {
				const err = nodeAnswer('max fee per gas less than block base fee');

				mockSendTransaction.mockRejectedValue(err);

				await expect(swap(mockSwapParams)).rejects.toThrow(err);

				expect(mockSendTransaction).toHaveBeenCalledOnce();
			});

			// The provider reports these as an outcome it cannot confirm, the node's answer as the cause.
			it.each([
				{ answer: 'already known', message: 'already known' },
				{ answer: 'nonce too low', message: 'nonce too low: next nonce 43, tx nonce 42' }
			])('should not send again after $answer', async ({ message }) => {
				const err = nodeAnswer(message);

				mockSendTransaction.mockRejectedValue(err);

				const outcome = await swap(mockSwapParams).catch((error: unknown) => error);

				expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
				expect(outcome).toHaveProperty('cause', err);
				expect(mockSendTransaction).toHaveBeenCalledOnce();
			});

			// A first attempt relayed despite its failure: the next one finds it in.
			it('should stop at an answer that the transaction is in', async () => {
				const known = nodeAnswer('already known');

				mockSendTransaction.mockRejectedValueOnce(new Error('fetch failed'));
				mockSendTransaction.mockRejectedValueOnce(known);

				const outcome = await swap(mockSwapParams).catch((error: unknown) => error);

				expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
				expect(outcome).toHaveProperty('cause', known);
				expect(mockSendTransaction).toHaveBeenCalledTimes(2);
			});
		});

		describe('pending activity of an ERC-20 source', () => {
			const getTransaction = vi.fn();

			const pendingValues = () =>
				get(ethTransactionsStore)?.[USDC_TOKEN.id]?.map(({ data }) => data.value);

			const swapWithCalldata = async (data: string) => {
				mockSendTransaction.mockResolvedValue({ ...mockTransactionResponse, data });
				getTransaction.mockResolvedValue({ ...mockTransactionResponse, data, value: ZERO });

				await swap({ ...mockSwapParams, token: USDC_TOKEN });
			};

			beforeEach(async () => {
				const { processTransactionSent: actual } = await vi.importActual<
					typeof ethTransactionServicesLib
				>('$eth/services/eth-transaction.services');

				vi.mocked(processTransactionSent).mockImplementation(actual);

				vi.spyOn(alchemyProvidersLib, 'alchemyProviders').mockReturnValue({
					getTransaction,
					// Stays pending, so the row is the one the swap added.
					wait: () => new Promise(() => {})
				} as unknown as AlchemyProvider);

				ethTransactionsStore.reset(USDC_TOKEN.id);
			});

			it('shows the amount swapped, not an offset read from the swap calldata', async () => {
				// The calldata's second word is an offset, 544, that a transfer decode reads as the amount.
				await swapWithCalldata(mockLifiCalldataAcrossEvm.quote.transactionRequest?.data as string);

				await vi.waitFor(() => expect(pendingValues()).toEqual([50_000_000n]));
			});

			it('shows the amount swapped for calldata a transfer decode throws on', async () => {
				// Its first word, a bytes32 transaction id, is no address.
				await swapWithCalldata(mockLifiCalldataSameChain.quote.transactionRequest?.data as string);

				await vi.waitFor(() => expect(pendingValues()).toEqual([50_000_000n]));
			});
		});

		it('should handle transaction with null data correctly', async () => {
			const paramsWithNullData = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, data: null as unknown as string }
			};

			await swap(paramsWithNullData);

			expect(signTransaction).toHaveBeenCalledWith({
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: [],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('0')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should handle transaction with non-zero value', async () => {
			const paramsWithValue = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, value: '1000000000000000000' }
			};

			await swap(paramsWithValue);

			expect(signTransaction).toHaveBeenCalledWith({
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: ['0x1234'],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('1000000000000000000')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should throw error if transaction gas is nullish', async () => {
			const paramsWithNullishGas = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, gas: null as unknown as string }
			};

			await expect(swap(paramsWithNullishGas)).rejects.toThrow(en.send.error.erc20_data_undefined);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
		});

		it('should handle error when getting transaction count', async () => {
			mockGetTransactionCount.mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).not.toHaveBeenCalled();
		});

		it('should handle error when signing transaction', async () => {
			vi.mocked(signTransaction).mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).toHaveBeenCalled();
			expect(mockSendTransaction).not.toHaveBeenCalled();
		});

		it('should handle error when sending transaction', async () => {
			mockSendTransaction.mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).toHaveBeenCalled();
			expect(mockSendTransaction).toHaveBeenCalledWith(mockRawTransaction);
			expect(processTransactionSent).not.toHaveBeenCalled();
		});

		describe('beforeBroadcast', () => {
			it('should run between signing and broadcasting, with the signed hash and the nonce', async () => {
				const beforeBroadcast = vi.fn().mockResolvedValue(undefined);

				await swap({ ...mockSwapParams, beforeBroadcast });

				expect(beforeBroadcast).toHaveBeenCalledExactlyOnceWith({
					hash: keccak256(mockRawTransaction),
					nonce: mockNonce
				});
				expect(vi.mocked(signTransaction).mock.invocationCallOrder[0]).toBeLessThan(
					beforeBroadcast.mock.invocationCallOrder[0] ?? 0
				);
				expect(beforeBroadcast.mock.invocationCallOrder[0]).toBeLessThan(
					mockSendTransaction.mock.invocationCallOrder[0] ?? 0
				);
			});

			it('should broadcast nothing when it rejects', async () => {
				const beforeBroadcast = vi.fn().mockRejectedValue(mockError);

				await expect(swap({ ...mockSwapParams, beforeBroadcast })).rejects.toThrow(mockError);

				expect(mockSendTransaction).not.toHaveBeenCalled();
				expect(processTransactionSent).not.toHaveBeenCalled();
			});
		});
	});
});
