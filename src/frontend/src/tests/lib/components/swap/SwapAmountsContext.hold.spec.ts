import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import SwapForm from '$lib/components/swap/SwapForm.svelte';
import {
	SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
	SWAP_PROVIDER_MIN_COMPARISON_MS
} from '$lib/constants/swap.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as authDerived from '$lib/derived/auth.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as swapService from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SwapProvider, type FetchSwapAmountsParams, type SwapMappedResult } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSwapContextEntry } from '$tests/utils/swap.context.test-utils';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { act, render } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('svelte/motion', async (importOriginal) => ({
	...(await importOriginal<object>()),
	prefersReducedMotion: {
		get current() {
			return motion.reduced;
		}
	}
}));

describe('SwapAmountsContext minimum comparison', () => {
	let store: ReturnType<typeof initSwapAmountsStore>;
	let activity: ReturnType<typeof initSwapQuoteActivityStore>;
	let context: ReturnType<typeof mockContextMap>;
	let rounds: {
		params: FetchSwapAmountsParams;
		resolve: (offers: SwapMappedResult[]) => void;
		reject: (reason: Error) => void;
	}[];
	const props = {
		amount: '0.25',
		sourceToken: mockValidIcToken,
		destinationToken: mockValidIcCkToken,
		slippageValue: '0.3',
		isSwapAmountsLoading: false,
		isSourceTokenIcrc2: true
	};
	const mountCoordinator = () => act(() => render(SwapAmountsContext, { props, context }));
	const mountForm = () =>
		act(() =>
			render(SwapForm, {
				props: {
					swapAmount: props.amount,
					receiveAmount: 10,
					slippageValue: props.slippageValue,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context
			})
		);
	const advance = async (ms = 300) => {
		await act(() => vi.advanceTimersByTimeAsync(ms));
		await runResolvedPromises();
	};
	const participate = ({ index, providers }: { index: number; providers: SwapProvider[] }) =>
		act(() =>
			providers.forEach((provider) => rounds[index].params.onProviderParticipating?.(provider))
		);
	const accept = async (index: number) => {
		await act(() => rounds[index].resolve(mockSwapProviders));
		await runResolvedPromises();
	};
	const comparedProviders = [SwapProvider.LIFI, SwapProvider.VELORA];

	beforeEach(() => {
		vi.useFakeTimers();
		store = initSwapAmountsStore();
		activity = initSwapQuoteActivityStore();
		rounds = [];
		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(tokensDerived, 'tokens', 'get').mockReturnValue(
			readable([props.sourceToken, props.destinationToken])
		);
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable('0x123'));
		vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementation(
			(params) => new Promise((resolve, reject) => rounds.push({ params, resolve, reject }))
		);
		icTokenFeeStore.setIcTokenFee({ tokenSymbol: mockValidIcToken.symbol, fee: 1000n });
		context = mockContextMap([
			[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
			[IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore }],
			mockSwapContextEntry({
				sourceToken: mockValidIcToken,
				destinationToken: mockValidIcCkToken
			})
		]);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		motion.reduced = false;
	});

	it('keeps a fast comparison between providers pending, with Review disabled, for the minimum time', async () => {
		const coordinator = await mountCoordinator();
		const form = await mountForm();
		const review = form.getByRole('button', { name: en.swap.text.review_button });
		await advance();
		await participate({ index: 0, providers: comparedProviders });
		await accept(0);

		expect(get(activity)).toMatchObject({ pending: true, providers: comparedProviders });
		expect(get(store)).toBeUndefined();
		expect(review).toBeDisabled();

		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS - 1);

		expect(get(activity)?.pending).toBeTruthy();
		expect(review).toBeDisabled();

		await advance(1);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);
		expect(review).toBeEnabled();

		form.unmount();
		coordinator.unmount();
	});

	it('counts the minimum from the first participant, not from the input change', async () => {
		const { unmount } = await mountCoordinator();
		await advance();
		await advance(200);
		await participate({ index: 0, providers: comparedProviders });
		await accept(0);
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS - 1);

		expect(get(activity)?.pending).toBeTruthy();

		await advance(1);

		expect(get(activity)?.pending).toBeFalsy();

		unmount();
	});

	it('reveals pricing slower than the minimum as soon as it is ready', async () => {
		const { unmount } = await mountCoordinator();
		await advance();
		await participate({ index: 0, providers: comparedProviders });
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS + 500);

		expect(get(activity)?.pending).toBeTruthy();

		await accept(0);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);

		unmount();
	});

	it('holds a failed comparison too, then shows no offers', async () => {
		const { unmount } = await mountCoordinator();
		await advance();
		await participate({ index: 0, providers: comparedProviders });
		await act(() => rounds[0].reject(new Error('no route')));
		await runResolvedPromises();

		expect(get(activity)?.pending).toBeTruthy();
		expect(get(store)).toBeUndefined();

		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.swaps).toEqual([]);

		unmount();
	});

	it('commits nothing from a comparison replaced during the hold', async () => {
		const { rerender, unmount } = await mountCoordinator();
		await advance();
		await participate({ index: 0, providers: comparedProviders });
		await accept(0);
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS / 2);
		await rerender({ amount: '0.5' });
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);

		expect(rounds).toHaveLength(2);
		expect(get(store)).toBeUndefined();
		expect(get(activity)).toMatchObject({ requestId: 2, pending: true, background: false });

		await participate({ index: 1, providers: [SwapProvider.LIFI] });
		await accept(1);
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.amountForSwap).toBe(0.5);

		unmount();
	});

	it('holds a one-provider comparison too, so the scroll can show the provider pool', async () => {
		const { unmount } = await mountCoordinator();
		await advance();
		await participate({ index: 0, providers: [SwapProvider.LIFI] });
		await accept(0);

		expect(get(activity)?.pending).toBeTruthy();

		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);

		unmount();
	});

	it('does not hold a foreground comparison under reduced motion', async () => {
		motion.reduced = true;
		const { unmount } = await mountCoordinator();
		await advance();
		await participate({ index: 0, providers: comparedProviders });
		await accept(0);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);

		unmount();
	});

	it('does not hold a background refresh', async () => {
		const { unmount } = await mountCoordinator();
		await advance();
		await accept(0);
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);

		expect(get(activity)).toMatchObject({ requestId: 2, pending: true, background: true });

		await participate({ index: 1, providers: comparedProviders });
		await accept(1);

		expect(get(activity)).toMatchObject({ requestId: 2, pending: false, background: true });

		unmount();
	});
});
