import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import * as addressDerived from '$lib/derived/address.derived';
import * as authStore from '$lib/derived/auth.derived';
import * as tokensStore from '$lib/derived/tokens.derived';
import * as nearIntentsService from '$lib/services/near-intents.services';
import * as swapService from '$lib/services/swap.services';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapAmountTooLowError } from '$lib/types/errors';
import type { OptionAmount } from '$lib/types/send';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import {
	mockValidIcCkToken,
	mockValidIcToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
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
		expect(value?.quoteError).toBeUndefined();
	});

	it('sets the quote error when fetchSwapAmounts throws an amount-too-low refusal', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockRejectedValue(
			new SwapAmountTooLowError('Amount is too low for bridge, try at least 8300', {
				type: 'token',
				value: 8300n
			})
		);

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
		expect(value?.quoteError).toEqual({
			type: 'amount-too-low',
			minimum: { type: 'token', value: 8300n }
		});
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

	describe('fetchGeneration - stale response protection', () => {
		const alternateDestinationToken = {
			...mockValidIcrcToken,
			symbol: 'ALT_DEST'
		} as IcToken;

		it('discards stale response when destination token changes mid-fetch', async () => {
			vi.useFakeTimers();

			const freshResults = [mockSwapProviders[0]];

			let resolveStale!: (v: SwapMappedResult[]) => void;
			let resolveFresh!: (v: SwapMappedResult[]) => void;

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementationOnce(() => new Promise((r) => (resolveStale = r)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFresh = r)));

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

			expect(fetchMock).toHaveBeenCalledOnce();

			await act(() =>
				rerender({
					amount: '10',
					sourceToken,
					destinationToken: alternateDestinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			expect(fetchMock).toHaveBeenCalledTimes(2);

			resolveStale(mockSwapProviders);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toBeUndefined();

			resolveFresh(freshResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(freshResults);
			expect(get(store)?.amountForSwap).toBe(10);

			vi.useRealTimers();
		});

		it('discards stale error when destination token changes mid-fetch', async () => {
			vi.useFakeTimers();

			const freshResults = [mockSwapProviders[0]];

			let rejectStale!: (e: Error) => void;
			let resolveFresh!: (v: SwapMappedResult[]) => void;

			vi.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementationOnce(() => new Promise((_, rej) => (rejectStale = rej)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFresh = r)));

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

			await act(() =>
				rerender({
					amount: '10',
					sourceToken,
					destinationToken: alternateDestinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			rejectStale(new Error('stale error'));
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toBeUndefined();

			resolveFresh(freshResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(freshResults);

			vi.useRealTimers();
		});

		it('discards in-flight response when pausing for review', async () => {
			vi.useFakeTimers();

			let resolveStale!: (v: SwapMappedResult[]) => void;

			vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementationOnce(
				() => new Promise((r) => (resolveStale = r))
			);

			const { rerender } = await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken,
						slippageValue: '0.3',
						children: fakeSnippet,
						isSwapAmountsLoading: false,
						isSourceTokenIcrc2: true,
						pauseAmountUpdates: false
					},
					context
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			await act(() =>
				rerender({
					amount: '10',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true,
					pauseAmountUpdates: true
				})
			);

			resolveStale(mockSwapProviders);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toBeUndefined();

			vi.useRealTimers();
		});

		it('discards stale periodic refresh when tokens change', async () => {
			vi.useFakeTimers();

			const freshResults = [mockSwapProviders[0]];

			let resolvePeriodicFetch!: (v: SwapMappedResult[]) => void;
			let resolveFresh!: (v: SwapMappedResult[]) => void;

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockResolvedValueOnce(mockSwapProviders)
				.mockImplementationOnce(() => new Promise((r) => (resolvePeriodicFetch = r)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFresh = r)));

			const { rerender } = await act(() =>
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

			expect(fetchMock).toHaveBeenCalledOnce();
			expect(get(store)?.swaps).toEqual(mockSwapProviders);

			await vi.advanceTimersByTimeAsync(5000);
			await tick();

			expect(fetchMock).toHaveBeenCalledTimes(2);

			store.reset();

			await act(() =>
				rerender({
					amount: '10',
					sourceToken,
					destinationToken: alternateDestinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true,
					enableAmountUpdates: true,
					pauseAmountUpdates: false
				})
			);

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			expect(fetchMock).toHaveBeenCalledTimes(3);

			resolvePeriodicFetch(mockSwapProviders);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)).toBeNull();

			resolveFresh(freshResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(freshResults);

			vi.useRealTimers();
		});

		it('applies only the latest result with rapid successive changes', async () => {
			vi.useFakeTimers();

			const finalResults = [mockSwapProviders[1]];

			let resolveFirst!: (v: SwapMappedResult[]) => void;
			let resolveFinal!: (v: SwapMappedResult[]) => void;

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFinal = r)));

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

			await vi.advanceTimersByTimeAsync(200);

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

			expect(fetchMock).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			expect(fetchMock).toHaveBeenCalledOnce();

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

			await vi.advanceTimersByTimeAsync(350);
			await tick();

			expect(fetchMock).toHaveBeenCalledTimes(2);

			resolveFirst(mockSwapProviders);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.amountForSwap).toBeUndefined();

			resolveFinal(finalResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(finalResults);
			expect(get(store)?.amountForSwap).toBe(30);

			vi.useRealTimers();
		});

		it('discards in-flight response from a destroyed component instance', async () => {
			vi.useFakeTimers();

			const freshResults = [mockSwapProviders[0]];

			let resolveStale!: (v: SwapMappedResult[]) => void;
			let resolveFresh!: (v: SwapMappedResult[]) => void;

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementationOnce(() => new Promise((r) => (resolveStale = r)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFresh = r)));

			const { unmount } = await act(() =>
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

			expect(fetchMock).toHaveBeenCalledOnce();

			store.reset();
			await act(() => unmount());

			await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken: alternateDestinationToken,
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

			expect(fetchMock).toHaveBeenCalledTimes(2);

			resolveStale(mockSwapProviders);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)).toBeNull();

			resolveFresh(freshResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(freshResults);

			vi.useRealTimers();
		});

		it('discards in-flight error from a destroyed component instance', async () => {
			vi.useFakeTimers();

			const freshResults = [mockSwapProviders[0]];

			let rejectStale!: (e: Error) => void;
			let resolveFresh!: (v: SwapMappedResult[]) => void;

			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementationOnce(() => new Promise((_, rej) => (rejectStale = rej)))
				.mockImplementationOnce(() => new Promise((r) => (resolveFresh = r)));

			const { unmount } = await act(() =>
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

			expect(fetchMock).toHaveBeenCalledOnce();

			store.reset();
			await act(() => unmount());

			await act(() =>
				render(SwapAmountsContext, {
					props: {
						amount: '10',
						sourceToken,
						destinationToken: alternateDestinationToken,
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

			expect(fetchMock).toHaveBeenCalledTimes(2);

			rejectStale(new Error('stale error'));
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)).toBeNull();

			resolveFresh(freshResults);
			await vi.advanceTimersByTimeAsync(0);
			await tick();

			expect(get(store)?.swaps).toEqual(freshResults);

			vi.useRealTimers();
		});
	});

	describe('NEAR Intents swap limit', () => {
		beforeEach(() => {
			nearIntentsSwapLimitStore.reset();
			vi.spyOn(swapService, 'fetchSwapAmounts').mockResolvedValue([]);
		});

		afterEach(() => {
			nearIntentsSwapLimitStore.reset();
		});

		it('loads the pair limit into the store', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(1000);

			await renderWithContext({
				amount: undefined,
				sourceToken,
				destinationToken,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			expect(nearIntentsService.fetchNearIntentsSwapLimit).toHaveBeenCalledWith({
				sourceToken,
				destinationToken
			});
			expect(get(nearIntentsSwapLimitStore)).toBe(1000);
		});

		// The floor depends on the pair alone, so it must not be re-fetched on the 5-second
		// quote refresh or on every keystroke in the amount field.
		it('does not reload the limit when only the amount changes', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(1000);

			const { rerender } = await renderWithContext({
				amount: '1',
				sourceToken,
				destinationToken,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			await act(() =>
				rerender({
					amount: '2',
					sourceToken,
					destinationToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);
			await waitForDebounce();

			expect(nearIntentsService.fetchNearIntentsSwapLimit).toHaveBeenCalledOnce();
		});

		it('reloads the limit when the pair changes', async () => {
			const limitMock = vi
				.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit')
				.mockResolvedValue(1000);

			const { rerender } = await renderWithContext({
				amount: '1',
				sourceToken,
				destinationToken,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			await act(() =>
				rerender({
					amount: '1',
					sourceToken,
					destinationToken: mockValidIcrcToken as IcToken,
					slippageValue: '0.3',
					children: fakeSnippet,
					isSwapAmountsLoading: false,
					isSourceTokenIcrc2: true
				})
			);
			await waitForDebounce();

			expect(limitMock).toHaveBeenCalledTimes(2);
			expect(limitMock).toHaveBeenLastCalledWith({
				sourceToken,
				destinationToken: mockValidIcrcToken
			});
		});

		// The form leaves the fiat case to the standing notice instead of a red message, so the
		// notice must not be missing just because the probe happened to fail.
		it('records the limit a real refusal names, even when the probe reached no verdict', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(undefined);
			vi.spyOn(swapService, 'fetchSwapAmounts').mockRejectedValue(
				new SwapAmountTooLowError('NEAR Intents quote failed: minimum swap amount is $1,000', {
					type: 'usd',
					value: 1000
				})
			);

			await renderWithContext({
				amount: '20',
				sourceToken,
				destinationToken,
				slippageValue: '0.2'
			});

			await waitForDebounce();

			expect(get(nearIntentsSwapLimitStore)).toBe(1000);
		});

		it('does not record a token-denominated refusal as a fiat limit', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(undefined);
			vi.spyOn(swapService, 'fetchSwapAmounts').mockRejectedValue(
				new SwapAmountTooLowError('NEAR Intents quote failed: try at least 8300', {
					type: 'token',
					value: 8300n
				})
			);

			await renderWithContext({
				amount: '20',
				sourceToken,
				destinationToken,
				slippageValue: '0.2'
			});

			await waitForDebounce();

			expect(get(nearIntentsSwapLimitStore)).toBeUndefined();
		});

		it('leaves the store empty when the probe reaches no verdict', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(undefined);

			await renderWithContext({
				amount: undefined,
				sourceToken,
				destinationToken,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			expect(get(nearIntentsSwapLimitStore)).toBeUndefined();
		});

		it('leaves the store empty when the probe throws', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockRejectedValue(
				new Error('probe exploded')
			);

			await renderWithContext({
				amount: undefined,
				sourceToken,
				destinationToken,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			expect(get(nearIntentsSwapLimitStore)).toBeUndefined();
		});

		it('does not probe until both tokens are chosen', async () => {
			vi.spyOn(nearIntentsService, 'fetchNearIntentsSwapLimit').mockResolvedValue(1000);

			await renderWithContext({
				amount: undefined,
				sourceToken,
				destinationToken: undefined,
				slippageValue: '0.3'
			});

			await waitForDebounce();

			expect(nearIntentsService.fetchNearIntentsSwapLimit).not.toHaveBeenCalled();
			expect(get(nearIntentsSwapLimitStore)).toBeUndefined();
		});
	});
});
