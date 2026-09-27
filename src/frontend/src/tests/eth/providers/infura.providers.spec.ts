import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	INFURA_READ_TIMEOUT_MILLISECONDS,
	INFURA_SUBMISSION_TIMEOUT_MILLISECONDS
} from '$eth/constants/eth.constants';
import { InfuraProvider, infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { EthSubmissionUnconfirmedError } from '$eth/types/send';
import {
	OP_STACK_GAS_PRICE_ORACLE_ABI,
	OP_STACK_GAS_PRICE_ORACLE_ADDRESS
} from '$evm/base/constants/base.constants';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS
} from '$lib/enums/plausible';
import { trackProviderFallback } from '$lib/services/provider-fallback-analytics.services';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { nonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { keccak256 } from 'ethers/crypto';
import {
	type FeeData,
	InfuraProvider as InfuraProviderLib,
	type TransactionResponse
} from 'ethers/providers';

const { mockFallbackEnabled } = vi.hoisted(() => ({ mockFallbackEnabled: { value: true } }));

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-alchemy-key',
	get ALCHEMY_EVM_FALLBACK_ENABLED() {
		return mockFallbackEnabled.value;
	}
}));

vi.mock('$lib/services/provider-fallback-analytics.services', () => ({
	trackProviderFallback: vi.fn()
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	// Infura failing the request itself, as ethers hands it over: nothing in it is about the call.
	const internalError = Object.assign(new Error('could not coalesce error'), {
		code: 'UNKNOWN_ERROR',
		error: { code: -32603, message: 'Internal error' }
	});

	// Both providers share one mock implementation, and a provider builds Infura first, then its
	// fallback, so the order of construction is what tells the two apart. They are
	// indistinguishable by value, so they are compared by identity.
	const buildProvider = (network: EthereumNetwork = ETHEREUM_NETWORK) => {
		const provider = new InfuraProvider(network);

		const [infura, alchemy] = vi.mocked(InfuraProviderLib).mock.instances;

		return { provider, infura, alchemy };
	};

	it('should create the correct map of providers', () => {
		// The shared setup mock gives `InfuraProvider` and `JsonRpcProvider` one implementation, so
		// both transports land on this same spy; the arguments are what say which transport each call
		// took. A network Infura hosts builds two: Infura, then Alchemy as its fallback. A network it
		// does not host is read over Alchemy alone, with nothing further to fall back to.
		const expectedCalls = networks.flatMap(({ providers: { infura, alchemyJsonRpcUrl } }) => {
			const alchemy = [
				expect.stringContaining(alchemyJsonRpcUrl),
				expect.anything(),
				{ staticNetwork: true }
			];

			return nonNullish(infura) ? [[infura, INFURA_API_KEY], alchemy] : [alchemy];
		});

		expect(vi.mocked(InfuraProviderLib).mock.calls).toEqual(expectedCalls);
	});

	describe('InfuraProvider', () => {
		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockGetTransactionCount = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			// Queued answers a failed test left unconsumed must not leak into the next one.
			mockGetTransactionCount.mockReset();

			mockFallbackEnabled.value = true;

			mockProvider.prototype.getTransactionCount = mockGetTransactionCount;
		});

		afterEach(() => {
			vi.useRealTimers();
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

			it('should propagate errors from Infura without asking Alchemy', async () => {
				// The confirmed count is no send's nonce, so it is not handed over.
				const mockError = new Error('Mock error');
				mockGetTransactionCount.mockRejectedValueOnce(mockError);

				const provider = new InfuraProvider(ETHEREUM_NETWORK);

				await expect(provider.getTransactionCountLatest(mockEthAddress)).rejects.toThrow(mockError);

				expect(mockGetTransactionCount).toHaveBeenCalledOnce();
				expect(trackProviderFallback).not.toHaveBeenCalled();
			});
		});

		describe('getTransactionCountPending', () => {
			const mockCount = 11;

			it('should read the pending count from Infura alone when it answers', async () => {
				const { provider, infura } = buildProvider();

				mockGetTransactionCount.mockResolvedValueOnce(mockCount);

				await expect(provider.getTransactionCountPending(mockEthAddress)).resolves.toBe(mockCount);

				expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith(mockEthAddress, 'pending');
				expect(mockGetTransactionCount.mock.contexts[0]).toBe(infura);
				expect(trackProviderFallback).not.toHaveBeenCalled();
			});

			it('should read the same pending count from Alchemy when Infura fails', async () => {
				const { provider, infura, alchemy } = buildProvider();

				mockGetTransactionCount
					.mockRejectedValueOnce(internalError)
					.mockResolvedValueOnce(mockCount);

				await expect(provider.getTransactionCountPending(mockEthAddress)).resolves.toBe(mockCount);

				expect(infura).not.toBe(alchemy);
				expect(mockGetTransactionCount.mock.calls).toEqual([
					[mockEthAddress, 'pending'],
					[mockEthAddress, 'pending']
				]);
				expect(mockGetTransactionCount.mock.contexts[0]).toBe(infura);
				expect(mockGetTransactionCount.mock.contexts[1]).toBe(alchemy);
				expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.NONCE,
					trigger: 'error',
					network: 'mainnet',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				});
			});

			it('should ask Alchemy when Infura does not answer within the read time limit', async () => {
				vi.useFakeTimers();

				const { provider, alchemy } = buildProvider();

				mockGetTransactionCount
					.mockReturnValueOnce(new Promise(() => {}))
					.mockResolvedValueOnce(mockCount);

				const result = provider.getTransactionCountPending(mockEthAddress);

				await vi.advanceTimersByTimeAsync(INFURA_READ_TIMEOUT_MILLISECONDS - 1);

				expect(mockGetTransactionCount).toHaveBeenCalledOnce();

				await vi.advanceTimersByTimeAsync(1);

				await expect(result).resolves.toBe(mockCount);

				expect(mockGetTransactionCount.mock.contexts[1]).toBe(alchemy);
				expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.NONCE,
						trigger: 'timeout',
						resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
					})
				);
			});

			it('should propagate the Infura error when Alchemy fails too', async () => {
				const { provider } = buildProvider();

				mockGetTransactionCount
					.mockRejectedValueOnce(internalError)
					.mockRejectedValueOnce(new Error('Alchemy failed too'));

				await expect(provider.getTransactionCountPending(mockEthAddress)).rejects.toBe(
					internalError
				);

				expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.NONCE,
						resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
					})
				);
			});

			it('should read from Infura alone when the fallback is switched off', async () => {
				mockFallbackEnabled.value = false;

				const { provider } = buildProvider();

				mockGetTransactionCount.mockRejectedValueOnce(internalError);

				await expect(provider.getTransactionCountPending(mockEthAddress)).rejects.toBe(
					internalError
				);

				expect(mockGetTransactionCount).toHaveBeenCalledOnce();
				expect(trackProviderFallback).not.toHaveBeenCalled();
			});

			it('should read once on a network with no second provider', async () => {
				const { provider } = buildProvider(ROBINHOOD_MAINNET_NETWORK);

				mockGetTransactionCount.mockRejectedValueOnce(internalError);

				await expect(provider.getTransactionCountPending(mockEthAddress)).rejects.toBe(
					internalError
				);

				expect(mockGetTransactionCount).toHaveBeenCalledOnce();
				expect(trackProviderFallback).not.toHaveBeenCalled();
			});
		});
	});

	describe('sendTransaction', () => {
		const signedTransaction = '0x1234abcd';

		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockBroadcastTransaction = vi.fn();
		const mockGetTransaction = vi.fn();

		const infuraResponse = { hash: keccak256(signedTransaction) } as TransactionResponse;
		const alchemyResponse = { hash: keccak256(signedTransaction) } as TransactionResponse;

		const refusal = Object.assign(new Error('nonce has already been used'), {
			code: 'NONCE_EXPIRED'
		});

		beforeEach(() => {
			vi.clearAllMocks();

			// Queued answers a failed test left unconsumed must not leak into the next one.
			mockBroadcastTransaction.mockReset();
			mockGetTransaction.mockReset();

			mockFallbackEnabled.value = true;

			mockProvider.prototype.broadcastTransaction = mockBroadcastTransaction;
			mockProvider.prototype.getTransaction = mockGetTransaction;
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should submit through Infura alone when it accepts the transaction', async () => {
			const { provider, infura } = buildProvider();

			mockBroadcastTransaction.mockResolvedValueOnce(infuraResponse);

			await expect(provider.sendTransaction(signedTransaction)).resolves.toBe(infuraResponse);

			expect(mockBroadcastTransaction).toHaveBeenCalledExactlyOnceWith(signedTransaction);
			expect(mockBroadcastTransaction.mock.contexts[0]).toBe(infura);
			expect(trackProviderFallback).not.toHaveBeenCalled();
		});

		it('should hand the same signed transaction to Alchemy when Infura fails', async () => {
			const { provider, infura, alchemy } = buildProvider();

			mockBroadcastTransaction
				.mockRejectedValueOnce(internalError)
				.mockResolvedValueOnce(alchemyResponse);

			await expect(provider.sendTransaction(signedTransaction)).resolves.toBe(alchemyResponse);

			// The two mocked providers are indistinguishable by value, so they are compared by identity.
			expect(infura).not.toBe(alchemy);
			expect(mockBroadcastTransaction.mock.calls).toEqual([
				[signedTransaction],
				[signedTransaction]
			]);
			expect(mockBroadcastTransaction.mock.contexts[0]).toBe(infura);
			expect(mockBroadcastTransaction.mock.contexts[1]).toBe(alchemy);
			expect(mockGetTransaction).not.toHaveBeenCalled();
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith({
				operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.SUBMISSION,
				trigger: 'error',
				network: 'mainnet',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
		});

		it('should ask Alchemy when Infura does not answer within the time limit', async () => {
			vi.useFakeTimers();

			const { provider, alchemy } = buildProvider();

			mockBroadcastTransaction
				.mockReturnValueOnce(new Promise(() => {}))
				.mockResolvedValueOnce(alchemyResponse);

			const result = provider.sendTransaction(signedTransaction);

			await vi.advanceTimersByTimeAsync(INFURA_SUBMISSION_TIMEOUT_MILLISECONDS - 1);

			expect(mockBroadcastTransaction).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);

			await expect(result).resolves.toBe(alchemyResponse);

			expect(mockBroadcastTransaction.mock.contexts[1]).toBe(alchemy);
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					trigger: 'timeout',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				})
			);
		});

		it('should succeed when both fail but the network knows the transaction', async () => {
			// Alchemy answers a transaction it already holds with an error of its own, and Infura may
			// have passed it on before failing the request.
			const { provider, alchemy } = buildProvider();

			const found = { hash: keccak256(signedTransaction) } as TransactionResponse;

			mockBroadcastTransaction
				.mockRejectedValueOnce(internalError)
				.mockRejectedValueOnce(new Error('already known'));
			mockGetTransaction.mockResolvedValueOnce(found);

			await expect(provider.sendTransaction(signedTransaction)).resolves.toBe(found);

			expect(mockGetTransaction).toHaveBeenCalledExactlyOnceWith(keccak256(signedTransaction));
			expect(mockGetTransaction.mock.contexts[0]).toBe(alchemy);
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS })
			);
		});

		it('should report the outcome as unknown when the network does not know the transaction', async () => {
			const { provider } = buildProvider();

			mockBroadcastTransaction
				.mockRejectedValueOnce(internalError)
				.mockRejectedValueOnce(new Error('Alchemy failed too'));
			mockGetTransaction.mockResolvedValueOnce(null);

			const outcome = await provider
				.sendTransaction(signedTransaction)
				.catch((err: unknown) => err);

			// A retry would be signed with the next nonce, so the send must not claim it went nowhere.
			expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
			expect(outcome).toHaveProperty('cause', internalError);
			expect(outcome).toHaveProperty('message', internalError.message);
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith({
				operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.SUBMISSION,
				trigger: 'error',
				network: 'mainnet',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
			});
		});

		it('should report the reason Alchemy gave over Infura failing the request', async () => {
			const { provider } = buildProvider();

			mockBroadcastTransaction.mockRejectedValueOnce(internalError).mockRejectedValueOnce(refusal);
			mockGetTransaction.mockResolvedValueOnce(null);

			await expect(provider.sendTransaction(signedTransaction)).rejects.toBe(refusal);
		});

		it('should report the reason Infura gave when both refuse the transaction', async () => {
			const { provider } = buildProvider();

			const infuraRefusal = Object.assign(new Error('insufficient funds'), {
				code: 'INSUFFICIENT_FUNDS'
			});

			mockBroadcastTransaction.mockRejectedValueOnce(infuraRefusal).mockRejectedValueOnce(refusal);
			mockGetTransaction.mockResolvedValueOnce(null);

			await expect(provider.sendTransaction(signedTransaction)).rejects.toBe(infuraRefusal);
		});

		it('should fail when the lookup cannot be answered either', async () => {
			const { provider } = buildProvider();

			mockBroadcastTransaction
				.mockRejectedValueOnce(internalError)
				.mockRejectedValueOnce(new Error('Alchemy failed too'));
			mockGetTransaction.mockRejectedValueOnce(new Error('lookup failed'));

			const outcome = await provider
				.sendTransaction(signedTransaction)
				.catch((err: unknown) => err);

			expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
			expect(outcome).toHaveProperty('cause', internalError);

			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR })
			);
		});

		it('should give Alchemy and the lookup no longer than their time limits', async () => {
			vi.useFakeTimers();

			const { provider } = buildProvider();

			mockBroadcastTransaction
				.mockRejectedValueOnce(internalError)
				.mockReturnValueOnce(new Promise(() => {}));
			mockGetTransaction.mockReturnValueOnce(new Promise(() => {}));

			// The rejection is taken as a value, so that it is handled the moment the timers produce it.
			const outcome = provider.sendTransaction(signedTransaction).catch((err: unknown) => err);

			await vi.advanceTimersByTimeAsync(INFURA_SUBMISSION_TIMEOUT_MILLISECONDS);

			expect(mockGetTransaction).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(INFURA_READ_TIMEOUT_MILLISECONDS);

			await expect(outcome).resolves.toBeInstanceOf(EthSubmissionUnconfirmedError);
			await expect(outcome).resolves.toHaveProperty('cause', internalError);
		});

		describe('when the fallback is switched off', () => {
			beforeEach(() => {
				mockFallbackEnabled.value = false;
			});

			it('should submit through Infura alone and report its outcome as unknown', async () => {
				const { provider } = buildProvider();

				mockBroadcastTransaction.mockRejectedValueOnce(internalError);

				const outcome = await provider
					.sendTransaction(signedTransaction)
					.catch((err: unknown) => err);

				expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
				expect(outcome).toHaveProperty('cause', internalError);

				expect(mockBroadcastTransaction).toHaveBeenCalledOnce();
				expect(mockGetTransaction).not.toHaveBeenCalled();
				expect(trackProviderFallback).not.toHaveBeenCalled();
			});

			it('should report a refusal from Infura as it is', async () => {
				const { provider } = buildProvider();

				mockBroadcastTransaction.mockRejectedValueOnce(refusal);

				await expect(provider.sendTransaction(signedTransaction)).rejects.toBe(refusal);
			});

			it('should not cut Infura short either', async () => {
				vi.useFakeTimers();

				const { provider } = buildProvider();

				let settled = false;

				mockBroadcastTransaction.mockReturnValueOnce(new Promise(() => {}));

				provider.sendTransaction(signedTransaction).finally(() => {
					settled = true;
				});

				await vi.advanceTimersByTimeAsync(INFURA_SUBMISSION_TIMEOUT_MILLISECONDS * 2);

				expect(settled).toBeFalsy();
				expect(mockBroadcastTransaction).toHaveBeenCalledOnce();
			});
		});

		it('should submit once on a network with no second provider', async () => {
			const { provider } = buildProvider(ROBINHOOD_MAINNET_NETWORK);

			expect(mockProvider).toHaveBeenCalledOnce();

			mockBroadcastTransaction.mockRejectedValueOnce(internalError);

			const outcome = await provider
				.sendTransaction(signedTransaction)
				.catch((err: unknown) => err);

			expect(outcome).toBeInstanceOf(EthSubmissionUnconfirmedError);
			expect(mockBroadcastTransaction).toHaveBeenCalledOnce();
			expect(trackProviderFallback).not.toHaveBeenCalled();
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

	describe('getFeeData', () => {
		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockGetFeeData = vi.fn();

		const infuraFeeData = { maxFeePerGas: 2_000n, maxPriorityFeePerGas: 1n } as FeeData;
		const alchemyFeeData = { maxFeePerGas: 3_000n, maxPriorityFeePerGas: 1n } as FeeData;

		// Infura failing the request itself, as ethers hands it over.
		const feeReadError = Object.assign(new Error('could not coalesce error'), {
			code: 'UNKNOWN_ERROR',
			error: { code: -32603, message: 'Internal error' }
		});

		// Both providers share one mock implementation, and a provider builds Infura first, then its
		// fallback, so the order of construction is what tells the two apart, by identity.
		const buildFeeProvider = (network: EthereumNetwork = ETHEREUM_NETWORK) => {
			const provider = new InfuraProvider(network);

			const [infura, alchemy] = mockProvider.mock.instances;

			return { provider, infura, alchemy };
		};

		beforeEach(() => {
			vi.clearAllMocks();

			// Queued answers a failed test left unconsumed must not leak into the next one.
			mockGetFeeData.mockReset();

			mockFallbackEnabled.value = true;

			mockProvider.prototype.getFeeData = mockGetFeeData;
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should read the fee from Infura alone when it answers', async () => {
			const { provider, infura } = buildFeeProvider();

			mockGetFeeData.mockResolvedValueOnce(infuraFeeData);

			await expect(provider.getFeeData()).resolves.toBe(infuraFeeData);

			expect(mockGetFeeData).toHaveBeenCalledOnce();
			expect(mockGetFeeData.mock.contexts[0]).toBe(infura);
			expect(trackProviderFallback).not.toHaveBeenCalled();
		});

		it('should read the fee from Alchemy when Infura fails', async () => {
			const { provider, infura, alchemy } = buildFeeProvider();

			mockGetFeeData.mockRejectedValueOnce(feeReadError).mockResolvedValueOnce(alchemyFeeData);

			await expect(provider.getFeeData()).resolves.toBe(alchemyFeeData);

			expect(infura).not.toBe(alchemy);
			expect(mockGetFeeData.mock.contexts[0]).toBe(infura);
			expect(mockGetFeeData.mock.contexts[1]).toBe(alchemy);
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith({
				operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.FEE,
				trigger: 'error',
				network: 'mainnet',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
		});

		it('should ask Alchemy when Infura does not answer within the read time limit', async () => {
			vi.useFakeTimers();

			const { provider, alchemy } = buildFeeProvider();

			mockGetFeeData
				.mockReturnValueOnce(new Promise(() => {}))
				.mockResolvedValueOnce(alchemyFeeData);

			const result = provider.getFeeData();

			await vi.advanceTimersByTimeAsync(INFURA_READ_TIMEOUT_MILLISECONDS - 1);

			expect(mockGetFeeData).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);

			await expect(result).resolves.toBe(alchemyFeeData);

			expect(mockGetFeeData.mock.contexts[1]).toBe(alchemy);
			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.FEE,
					trigger: 'timeout',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				})
			);
		});

		it('should fail with the Infura error when Alchemy fails too', async () => {
			// The fee context then retries with backoff and shows its toast, as before.
			const { provider } = buildFeeProvider();

			mockGetFeeData
				.mockRejectedValueOnce(feeReadError)
				.mockRejectedValueOnce(new Error('Alchemy failed too'));

			await expect(provider.getFeeData()).rejects.toBe(feeReadError);

			expect(trackProviderFallback).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.FEE,
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
				})
			);
		});

		it('should read from Infura alone when the fallback is switched off', async () => {
			mockFallbackEnabled.value = false;

			const { provider } = buildFeeProvider();

			mockGetFeeData.mockRejectedValueOnce(feeReadError);

			await expect(provider.getFeeData()).rejects.toBe(feeReadError);

			expect(mockGetFeeData).toHaveBeenCalledOnce();
			expect(trackProviderFallback).not.toHaveBeenCalled();
		});

		it('should read once on a network with no second provider', async () => {
			const { provider } = buildFeeProvider(ROBINHOOD_MAINNET_NETWORK);

			mockGetFeeData.mockRejectedValueOnce(feeReadError);

			await expect(provider.getFeeData()).rejects.toBe(feeReadError);

			expect(mockGetFeeData).toHaveBeenCalledOnce();
			expect(trackProviderFallback).not.toHaveBeenCalled();
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
