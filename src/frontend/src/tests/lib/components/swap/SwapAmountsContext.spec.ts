import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import * as addressDerived from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import * as tokensStore from '$lib/derived/tokens.derived';
import * as swapService from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { OptionAmount } from '$lib/types/send';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { act, render } from '@testing-library/svelte';
import { tick, type Snippet } from 'svelte';
import { get, readable, writable } from 'svelte/store';

const fakeSnippet: Snippet = (() => {}) as Snippet;

interface SwapAmountsContextProps {
	amount: OptionAmount;
	sourceToken: IcToken | undefined;
	destinationToken: IcToken | undefined;
	slippageValue: OptionAmount;
	enableAmountUpdates?: boolean;
	pauseAmountUpdates?: boolean;
}

describe('SwapAmountsContext.svelte', () => {
	const [sourceToken, destinationToken] = [mockValidIcToken, mockValidIcCkToken] as IcToken[];

	let context: Map<symbol, unknown>;
	let store: ReturnType<typeof initSwapAmountsStore>;

	const renderWithContext = async (componentProps: SwapAmountsContextProps) => {
		const result = await act(() =>
			render(SwapAmountsContext, {
				props: {
					...componentProps,
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				},
				context
			})
		);

		await tick();
		return result;
	};

	const waitForDebounce = async () => {
		await new Promise((resolve) => setTimeout(resolve, 350));
		await tick();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		store = initSwapAmountsStore();

		context = new Map([
			[
				SWAP_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(destinationToken),
					isSourceTokenIcrc2: readable(true),
					failedSwapError: writable(undefined)
				}
			],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store }],
			[
				IC_TOKEN_FEE_CONTEXT_KEY,
				{
					store: readable({
						[sourceToken.symbol]: 1000n
					})
				}
			]
		]);

		vi.spyOn(authStore, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
		vi.spyOn(tokensStore, 'tokens', 'get').mockImplementation(() =>
			readable([sourceToken, destinationToken])
		);
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockImplementation(() => readable('0x123'));
		vi.spyOn(addressDerived, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1')
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('resets store when amount is undefined', async () => {
		await renderWithContext({
			amount: undefined,
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		await waitForDebounce();

		expect(get(store)).toBeNull();
	});

	it('resets store when source token is undefined', async () => {
		await renderWithContext({
			amount: '100',
			sourceToken: undefined,
			destinationToken,
			slippageValue: '0.3'
		});

		await waitForDebounce();

		expect(get(store)).toBeNull();
	});

	it('resets store when destination token is undefined', async () => {
		await renderWithContext({
			amount: '100',
			sourceToken,
			destinationToken: undefined,
			slippageValue: '0.3'
		});

		await waitForDebounce();

		expect(get(store)).toBeNull();
	});

	it('resets store when fetchSwapAmounts returns empty', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockResolvedValue([]);

		await renderWithContext({
			amount: '15',
			sourceToken,
			destinationToken,
			slippageValue: '0.1'
		});

		await waitForDebounce();

		expect(get(store)).toEqual({
			amountForSwap: 15,
			selectedProvider: undefined,
			swaps: []
		});
	});

	it('sets swaps when fetchSwapAmounts succeeds', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		await renderWithContext({
			amount: '10',
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		await waitForDebounce();

		expect(fetchMock).toHaveBeenCalled();

		const value = get(store);

		expect(value?.swaps).toEqual(mockSwapProviders);
		expect(value?.selectedProvider).toEqual(mockSwapProviders[0]);
		expect(value?.amountForSwap).toBe(10);
	});

	it('sets empty swaps if fetchSwapAmounts throws', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockRejectedValue(new Error('fail'));

		await renderWithContext({
			amount: '20',
			sourceToken,
			destinationToken,
			slippageValue: '0.2'
		});

		await waitForDebounce();

		const value = get(store);

		expect(value?.swaps).toEqual([]);
		expect(value?.selectedProvider).toBeUndefined();
		expect(value?.amountForSwap).toBe(20);
	});

	it('debounces fetchSwapAmounts calls', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		await renderWithContext({
			amount: '10',
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(fetchMock).not.toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('does not call fetchSwapAmounts if amount has not changed', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: 10,
			selectedProvider: mockSwapProviders[0]
		});

		await renderWithContext({
			amount: '10',
			sourceToken,
			destinationToken,
			slippageValue: '0.3'
		});

		await waitForDebounce();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('preserves manual provider selection across periodic refresh', async () => {
		vi.useFakeTimers();

		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: 10,
			selectedProvider: mockSwapProviders[0]
		});

		store.setManualProvider(mockSwapProviders[1]);

		expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.KONG_SWAP);

		await act(() =>
			render(SwapAmountsContext, {
				props: {
					amount: '10',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true,
					enableAmountUpdates: true,
					pauseAmountUpdates: false
				},
				context
			})
		);

		await vi.advanceTimersByTimeAsync(350);
		await tick();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.KONG_SWAP);

		await vi.advanceTimersByTimeAsync(5100);
		await tick();

		expect(fetchMock).toHaveBeenCalled();
		expect(get(store)?.selectedProvider?.provider).toBe(SwapProvider.KONG_SWAP);

		vi.useRealTimers();
	});

	it('does not fetch when pauseAmountUpdates is true', async () => {
		vi.useFakeTimers();

		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);

		store.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: 10,
			selectedProvider: mockSwapProviders[0]
		});

		await act(() =>
			render(SwapAmountsContext, {
				props: {
					amount: '10',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true,
					enableAmountUpdates: true,
					pauseAmountUpdates: true
				},
				context
			})
		);

		await vi.advanceTimersByTimeAsync(350);
		await tick();

		await vi.advanceTimersByTimeAsync(10_000);
		await tick();

		expect(fetchMock).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	describe('generation counter - stale fetch protection', () => {
		it('discards stale fetch result when amount changes during in-flight request', async () => {
			vi.useFakeTimers();

			let resolveFirstFetch!: (value: SwapMappedResult[]) => void;
			const firstFetchPromise = new Promise<SwapMappedResult[]>((resolve) => {
				resolveFirstFetch = resolve;
			});

			const staleResults = [
				{ ...mockSwapProviders[0], receiveAmount: 111n }
			] as SwapMappedResult[];
			const freshResults = [
				{ ...mockSwapProviders[0], receiveAmount: 222n }
			] as SwapMappedResult[];

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockReturnValueOnce(firstFetchPromise)
				.mockResolvedValueOnce(freshResults);

			const { rerender } = await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken,
						slippageValue: '0.3',
						children: fakeSnippet,
						isSwapAmountsLoading: false,
						isSourceTokenIcrc2: true
					},
					context
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();
			expect(fetchMock).toHaveBeenCalledTimes(1);

			await act(() =>
				rerender({
					amount: '20',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);

			await act(async () => {
				resolveFirstFetch(staleResults);
			});
			await tick();

			const storeAfterStale = get(store);
			expect(storeAfterStale?.amountForSwap).not.toBe(10);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			const storeAfterFresh = get(store);
			expect(storeAfterFresh?.amountForSwap).toBe(20);
			expect(storeAfterFresh?.selectedProvider?.receiveAmount).toBe(222n);

			vi.useRealTimers();
		});

		it('discards stale fetch error when amount changes during in-flight request', async () => {
			vi.useFakeTimers();

			let rejectFirstFetch!: (error: unknown) => void;
			const firstFetchPromise = new Promise<SwapMappedResult[]>((_, reject) => {
				rejectFirstFetch = reject;
			});

			const freshResults = [
				{ ...mockSwapProviders[0], receiveAmount: 333n }
			] as SwapMappedResult[];

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockReturnValueOnce(firstFetchPromise)
				.mockResolvedValueOnce(freshResults);

			const { rerender } = await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken,
						slippageValue: '0.3',
						children: fakeSnippet,
						isSwapAmountsLoading: false,
						isSourceTokenIcrc2: true
					},
					context
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();
			expect(fetchMock).toHaveBeenCalledTimes(1);

			await act(() =>
				rerender({
					amount: '30',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);

			await act(async () => {
				rejectFirstFetch(new Error('stale error'));
			});
			await tick();

			const storeAfterStaleError = get(store);
			expect(storeAfterStaleError?.amountForSwap).not.toBe(10);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			const storeAfterFresh = get(store);
			expect(storeAfterFresh?.amountForSwap).toBe(30);
			expect(storeAfterFresh?.selectedProvider?.receiveAmount).toBe(333n);

			vi.useRealTimers();
		});

		it('accepts non-stale fetch result when dependencies have not changed', async () => {
			vi.useFakeTimers();

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockResolvedValue(mockSwapProviders);

			await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken,
						slippageValue: '0.3',
						children: fakeSnippet,
						isSwapAmountsLoading: false,
						isSourceTokenIcrc2: true
					},
					context
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			expect(fetchMock).toHaveBeenCalledTimes(1);

			const storeValue = get(store);
			expect(storeValue?.amountForSwap).toBe(10);
			expect(storeValue?.swaps).toEqual(mockSwapProviders);
			expect(storeValue?.selectedProvider).toEqual(mockSwapProviders[0]);

			vi.useRealTimers();
		});
	});
});
