import {
	CustomRpcProvider,
	__resetCustomRpcProvidersCache,
	customRpcProviders
} from '$eth/providers/custom-rpc.providers';
import type { CustomEvmNetwork } from '$eth/types/custom-network';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.constants';
import * as analytics from '$lib/services/analytics.services';
import { parseNetworkId } from '$lib/validation/network.validation';
import { JsonRpcProvider, Network } from 'ethers/providers';
import type { Writable, writable } from 'svelte/store';

const { customEvmNetworksStoreMock } = vi.hoisted(
	(): { customEvmNetworksStoreMock: Writable<CustomEvmNetwork[]> } => {
		// Require so that the writable is created before `vi.mock` is hoisted.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const svelteStore = require('svelte/store') as { writable: typeof writable };
		return { customEvmNetworksStoreMock: svelteStore.writable<CustomEvmNetwork[]>([]) };
	}
);

vi.mock('$eth/stores/custom-evm-networks.store', () => ({
	customEvmNetworksStore: customEvmNetworksStoreMock
}));

const buildNetwork = (overrides: Partial<CustomEvmNetwork> = {}): CustomEvmNetwork => ({
	id: parseNetworkId('custom-evm-test'),
	chainId: 10n,
	name: 'Optimism',
	rpcUrl: 'https://mainnet.optimism.io',
	currencySymbol: 'ETH',
	env: 'mainnet',
	...overrides
});

describe('custom-rpc.providers', () => {
	const mockJsonRpcProvider = vi.mocked(JsonRpcProvider);
	const mockNetwork = vi.mocked(Network);

	const mockGetBalance = vi.fn();
	const mockGetFeeData = vi.fn();
	const mockEstimateGas = vi.fn();
	const mockBroadcastTransaction = vi.fn();
	const mockGetTransactionCount = vi.fn();
	const mockGetBlockNumber = vi.fn();
	const mockDestroy = vi.fn();

	beforeEach(() => {
		// Reset the cache first so any `destroy()` calls triggered by leftover
		// entries from the previous test are wiped by `clearAllMocks` below
		// rather than counted against the current test's expectations.
		__resetCustomRpcProvidersCache();
		customEvmNetworksStoreMock.set([]);
		vi.clearAllMocks();

		mockJsonRpcProvider.prototype.getBalance = mockGetBalance;
		mockJsonRpcProvider.prototype.getFeeData = mockGetFeeData;
		mockJsonRpcProvider.prototype.estimateGas = mockEstimateGas;
		mockJsonRpcProvider.prototype.broadcastTransaction = mockBroadcastTransaction;
		mockJsonRpcProvider.prototype.getTransactionCount = mockGetTransactionCount;
		mockJsonRpcProvider.prototype.getBlockNumber = mockGetBlockNumber;
		mockJsonRpcProvider.prototype.destroy = mockDestroy;
	});

	describe('CustomRpcProvider', () => {
		it('constructs a JsonRpcProvider with the user-supplied URL and a static Network', () => {
			new CustomRpcProvider({
				rpcUrl: 'https://rpc.example',
				chainId: 10n,
				name: 'Optimism'
			});

			expect(mockNetwork).toHaveBeenCalledExactlyOnceWith('Optimism', 10n);
			expect(mockJsonRpcProvider).toHaveBeenCalledExactlyOnceWith(
				'https://rpc.example',
				expect.any(Object),
				{ staticNetwork: expect.any(Object) }
			);
		});

		it('delegates balance to provider.getBalance', async () => {
			mockGetBalance.mockResolvedValue(42n);
			const provider = new CustomRpcProvider({
				rpcUrl: 'https://rpc.example',
				chainId: 10n,
				name: 'Optimism'
			});

			const result = await provider.balance('0xabc');

			expect(result).toBe(42n);
			expect(mockGetBalance).toHaveBeenCalledExactlyOnceWith('0xabc');
		});

		it('delegates getFeeData, getBlockNumber, sendTransaction, getTransactionCount, estimateGas', async () => {
			mockGetFeeData.mockResolvedValue('fee-data');
			mockGetBlockNumber.mockResolvedValue(123);
			mockBroadcastTransaction.mockResolvedValue('tx-response');
			mockGetTransactionCount.mockResolvedValue(7);
			mockEstimateGas.mockResolvedValue(21000n);

			const provider = new CustomRpcProvider({
				rpcUrl: 'https://rpc.example',
				chainId: 10n,
				name: 'Optimism'
			});

			await expect(provider.getFeeData()).resolves.toBe('fee-data');
			await expect(provider.getBlockNumber()).resolves.toBe(123);
			await expect(provider.sendTransaction('0xsigned')).resolves.toBe('tx-response');
			await expect(provider.getTransactionCount({ address: '0xabc', tag: 'latest' })).resolves.toBe(
				7
			);
			await expect(provider.estimateGas({ to: '0xabc' } as never)).resolves.toBe(21000n);

			expect(mockBroadcastTransaction).toHaveBeenCalledExactlyOnceWith('0xsigned');
			expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith('0xabc', 'latest');
		});

		describe('safeEstimateGas', () => {
			it('returns the estimate on success', async () => {
				mockEstimateGas.mockResolvedValue(21000n);
				const provider = new CustomRpcProvider({
					rpcUrl: 'https://rpc.example',
					chainId: 10n,
					name: 'Optimism'
				});

				const result = await provider.safeEstimateGas({ to: '0xabc' } as never);

				expect(result).toBe(21000n);
			});

			it('tracks an analytics event and returns undefined on failure', async () => {
				const trackSpy = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
				mockEstimateGas.mockRejectedValue(new Error('boom'));
				const provider = new CustomRpcProvider({
					rpcUrl: 'https://rpc.example',
					chainId: 10n,
					name: 'Optimism'
				});

				const result = await provider.safeEstimateGas({ to: '0xabc' } as never);

				expect(result).toBeUndefined();
				expect(trackSpy).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_ETH_ESTIMATE_GAS_ERROR,
					metadata: {
						error: 'boom',
						network: 'Optimism'
					},
					warning: 'Error estimating gas for custom network Optimism: boom'
				});
			});
		});

		it('destroy delegates to provider.destroy', () => {
			const provider = new CustomRpcProvider({
				rpcUrl: 'https://rpc.example',
				chainId: 10n,
				name: 'Optimism'
			});

			provider.destroy();

			expect(mockDestroy).toHaveBeenCalledOnce();
		});
	});

	describe('customRpcProviders (factory)', () => {
		it('caches providers per (chainId, rpcUrl, name) tuple', () => {
			const network = buildNetwork();

			const first = customRpcProviders(network);
			const second = customRpcProviders(network);

			expect(first).toBe(second);
			expect(mockJsonRpcProvider).toHaveBeenCalledOnce();
		});

		it('creates a new provider when rpcUrl changes', () => {
			const first = customRpcProviders(buildNetwork({ rpcUrl: 'https://a.example' }));
			const second = customRpcProviders(buildNetwork({ rpcUrl: 'https://b.example' }));

			expect(first).not.toBe(second);
			expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
		});

		it('creates a new provider when chainId changes', () => {
			const first = customRpcProviders(buildNetwork({ chainId: 10n }));
			const second = customRpcProviders(buildNetwork({ chainId: 100n }));

			expect(first).not.toBe(second);
			expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
		});

		it('creates a new provider when name changes', () => {
			const first = customRpcProviders(buildNetwork({ name: 'Optimism' }));
			const second = customRpcProviders(buildNetwork({ name: 'Optimism (renamed)' }));

			expect(first).not.toBe(second);
			expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
		});

		it('does not collide when a moved `:` segment shifts between rpcUrl and name', () => {
			// Sanity check for the cache-key encoding: naive `${chainId}:${rpcUrl}:${name}`
			// would collapse these two tuples into the same string.
			const first = customRpcProviders(buildNetwork({ rpcUrl: 'https://foo:8545', name: 'bar' }));
			const second = customRpcProviders(buildNetwork({ rpcUrl: 'https://foo', name: '8545:bar' }));

			expect(first).not.toBe(second);
			expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
		});

		describe('cache eviction via store subscription', () => {
			it('destroys and drops cached providers that are no longer in the store', () => {
				const network = buildNetwork();
				customEvmNetworksStoreMock.set([network]);

				const provider = customRpcProviders(network);

				customEvmNetworksStoreMock.set([]);

				expect(mockDestroy).toHaveBeenCalledOnce();

				const rebuilt = customRpcProviders(network);

				expect(rebuilt).not.toBe(provider);
				expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
			});

			it('evicts the stale entry when a network is edited (rpcUrl, name, or chainId)', () => {
				const original = buildNetwork({ rpcUrl: 'https://a.example' });
				customEvmNetworksStoreMock.set([original]);
				customRpcProviders(original);

				const edited = { ...original, rpcUrl: 'https://b.example' };
				customEvmNetworksStoreMock.set([edited]);

				expect(mockDestroy).toHaveBeenCalledOnce();
			});

			it('leaves unrelated cached providers intact', () => {
				const a = buildNetwork({ chainId: 10n, rpcUrl: 'https://a.example' });
				const b = buildNetwork({ chainId: 100n, rpcUrl: 'https://b.example' });
				customEvmNetworksStoreMock.set([a, b]);
				const providerA = customRpcProviders(a);
				customRpcProviders(b);

				customEvmNetworksStoreMock.set([a]);

				expect(mockDestroy).toHaveBeenCalledOnce();
				expect(customRpcProviders(a)).toBe(providerA);
			});

			it('does not evict when a new network is added alongside an existing one', () => {
				const a = buildNetwork({ chainId: 10n, rpcUrl: 'https://a.example' });
				const b = buildNetwork({ chainId: 100n, rpcUrl: 'https://b.example' });
				customEvmNetworksStoreMock.set([a]);
				const providerA = customRpcProviders(a);

				customEvmNetworksStoreMock.set([a, b]);

				expect(mockDestroy).not.toHaveBeenCalled();
				expect(customRpcProviders(a)).toBe(providerA);
			});

			it('is a no-op when the same list is re-set (no destroy, same instance)', () => {
				const network = buildNetwork();
				customEvmNetworksStoreMock.set([network]);
				const provider = customRpcProviders(network);

				customEvmNetworksStoreMock.set([network]);

				expect(mockDestroy).not.toHaveBeenCalled();
				expect(customRpcProviders(network)).toBe(provider);
			});
		});
	});
});
