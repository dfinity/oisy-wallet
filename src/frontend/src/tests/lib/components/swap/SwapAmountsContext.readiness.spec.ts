import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import SwapForm from '$lib/components/swap/SwapForm.svelte';
import {
	SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
	SWAP_PROVIDER_MIN_COMPARISON_MS
} from '$lib/constants/swap.constants';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
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
import type { ComponentProps } from 'svelte';
import { get, readable, writable } from 'svelte/store';

// Mount the real coordinator and shared form with the same stores. Network pricing and
// fee inputs are controlled; form validation and the quote lifecycle are not mocked.
describe('SwapAmountsContext current-parameter Review readiness', () => {
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
		isSourceTokenIcrc2: true,
		pauseAmountUpdates: false
	};
	const mountCoordinator = (overrides: Partial<ComponentProps<typeof SwapAmountsContext>> = {}) =>
		act(() => render(SwapAmountsContext, { props: { ...props, ...overrides }, context }));
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
	const accept = async ({
		index,
		offers = mockSwapProviders
	}: {
		index: number;
		offers?: SwapMappedResult[];
	}) => {
		await act(() => rounds[index].resolve(offers));
		await runResolvedPromises();
	};

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
	});

	it('loads the receive field on a same-amount slippage edit through debounce, pricing and the comparison hold', async () => {
		const coordinator = await mountCoordinator();
		const form = await mountForm();
		const review = form.getByRole('button', { name: en.swap.text.review_button });
		const [, receiveInput] = form.getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);
		const receiveField = receiveInput.closest('.token-input-currency');
		await advance();
		await accept({ index: 0 });

		expect(review).toBeEnabled();
		expect(receiveInput).toHaveValue('10');
		expect(receiveField).not.toHaveClass('animate-pulse');

		await form.rerender({ slippageValue: '1' });

		expect(review).toBeEnabled();

		await coordinator.rerender({ slippageValue: '1' });

		expect(get(store)?.amountForSwap).toBe(0.25);
		expect(rounds).toHaveLength(1);
		expect(review).toBeDisabled();
		expect(receiveInput).toHaveValue('0');
		expect(receiveField).toHaveClass('animate-pulse');

		await advance(299);

		expect(rounds).toHaveLength(1);
		expect(review).toBeDisabled();
		expect(receiveField).toHaveClass('animate-pulse');

		await advance(1);

		expect(rounds).toHaveLength(2);
		expect(rounds[1].params.slippage).toBe('1');
		expect(get(activity)).toMatchObject({ pending: true, background: false });
		expect(review).toBeDisabled();
		expect(receiveField).toHaveClass('animate-pulse');

		await act(() => rounds[1].params.onProviderParticipating?.(SwapProvider.LIFI));
		await accept({ index: 1 });

		expect(get(activity)?.pending).toBeTruthy();
		expect(review).toBeDisabled();
		expect(receiveInput).toHaveValue('0');
		expect(receiveField).toHaveClass('animate-pulse');

		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS - 1);

		expect(receiveField).toHaveClass('animate-pulse');

		await advance(1);

		expect(get(activity)?.pending).toBeFalsy();
		expect(review).toBeEnabled();
		expect(receiveInput).toHaveValue('10');
		expect(receiveField).not.toHaveClass('animate-pulse');

		form.unmount();
		coordinator.unmount();
	});

	it.each(['success', 'failure'] as const)(
		'keeps Review blocked when an invalidated round reports a late %s during the new debounce',
		async (outcome) => {
			const coordinator = await mountCoordinator();
			const form = await mountForm();
			const review = form.getByRole('button', { name: en.swap.text.review_button });
			await advance();
			await accept({ index: 0 });
			await coordinator.rerender({ slippageValue: '1' });
			await advance();
			await coordinator.rerender({ slippageValue: '1.5' });
			const queued = get(activity);
			const subscriber = vi.fn();
			const unsubscribe = activity.subscribe(subscriber);
			subscriber.mockClear();

			await act(() => {
				rounds[1].params.onProviderParticipating?.(SwapProvider.LIFI);
				if (outcome === 'success') {
					rounds[1].resolve([mockSwapProviders[1]]);
				} else {
					rounds[1].reject(new Error('stale quote failed'));
				}
			});
			await runResolvedPromises();

			expect(subscriber).not.toHaveBeenCalled();
			expect(get(activity)).toBe(queued);
			expect(queued).toMatchObject({ pending: true, background: false, providers: [] });
			expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);
			expect(review).toBeDisabled();
			expect(rounds).toHaveLength(2);

			await advance();

			expect(rounds).toHaveLength(3);
			expect(review).toBeDisabled();

			await accept({ index: 2, offers: [mockSwapProviders[1]] });

			expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);
			expect(review).toBeEnabled();

			unsubscribe();
			form.unmount();
			coordinator.unmount();
		}
	);

	it.each([
		{ mode: 'pause', stage: 'queued' },
		{ mode: 'pause', stage: 'pricing' },
		{ mode: 'destroy', stage: 'queued' },
		{ mode: 'destroy', stage: 'pricing' }
	] as const)(
		'does not reuse an invalid quote after $mode during $stage',
		async ({ mode, stage }) => {
			const coordinator = await mountCoordinator();
			const form = await mountForm();
			const review = form.getByRole('button', { name: en.swap.text.review_button });
			await advance();
			await accept({ index: 0 });
			await coordinator.rerender({ slippageValue: '1' });
			if (stage === 'pricing') {
				await advance();
			}

			if (mode === 'pause') {
				await coordinator.rerender({ pauseAmountUpdates: true });
			} else {
				await act(() => coordinator.unmount());
			}

			expect(get(activity)).toBeUndefined();
			expect(review).toBeDisabled();
			expect(get(store)?.selectedProvider).toBeUndefined();

			if (stage === 'pricing') {
				await act(() => rounds[1].params.onProviderParticipating?.(SwapProvider.LIFI));
				await accept({ index: 1 });
			}
			const roundCount = rounds.length;
			await advance(10_000);

			expect(rounds).toHaveLength(roundCount);
			expect(review).toBeDisabled();

			if (mode === 'pause') {
				await coordinator.rerender({ pauseAmountUpdates: false });
			}
			const replacement =
				mode === 'pause' ? coordinator : await mountCoordinator({ slippageValue: '1' });

			expect(get(activity)).toMatchObject({ pending: true, background: false });
			expect(review).toBeDisabled();

			await advance();
			await accept({ index: roundCount });

			expect(review).toBeEnabled();

			form.unmount();
			replacement.unmount();
		}
	);

	it.each(['identity', 'source', 'destination', 'amount', 'icrc2'] as const)(
		'discards retained offers immediately when the %s prerequisite disappears',
		async (prerequisite) => {
			const identity = writable<typeof mockIdentity | undefined>(mockIdentity);
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identity);
			const coordinator = await mountCoordinator();
			const form = await mountForm();
			const review = form.getByRole('button', { name: en.swap.text.review_button });
			await advance();
			await accept({ index: 0 });
			await coordinator.rerender({ slippageValue: '1' });
			await advance();

			if (prerequisite === 'identity') {
				await act(() => identity.set(undefined));
			} else {
				const change = {
					source: { sourceToken: undefined },
					destination: { destinationToken: undefined },
					amount: { amount: undefined },
					icrc2: { isSourceTokenIcrc2: undefined }
				}[prerequisite];
				await coordinator.rerender(change);
			}

			expect(get(activity)).toBeUndefined();
			expect(review).toBeDisabled();
			expect(get(store)?.selectedProvider).toBeUndefined();

			await act(() => rounds[1].params.onProviderParticipating?.(SwapProvider.LIFI));
			await accept({ index: 1 });
			await advance(10_000);

			expect(rounds).toHaveLength(2);
			expect(get(activity)).toBeUndefined();
			expect(get(store)?.selectedProvider).toBeUndefined();
			expect(review).toBeDisabled();

			form.unmount();
			coordinator.unmount();
		}
	);

	it('keeps usable background quotes reviewable and preserves manual selection across Review-step coordinator remounts', async () => {
		const coordinator = await mountCoordinator();
		const form = await mountForm();
		const review = form.getByRole('button', { name: en.swap.text.review_button });
		await advance();
		await accept({ index: 0 });
		await act(() => store.setManualProvider(mockSwapProviders[1]));
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);

		expect(rounds).toHaveLength(2);
		expect(get(activity)).toMatchObject({ pending: true, background: true });
		expect(review).toBeEnabled();

		// SwapModalWizardSteps keys the whole token wizard by step, not only the form.
		form.unmount();
		coordinator.unmount();
		const reviewCoordinator = await mountCoordinator({ pauseAmountUpdates: true });
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS * 2);

		expect(rounds).toHaveLength(2);
		expect(get(activity)).toBeUndefined();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);

		reviewCoordinator.unmount();
		const returnedCoordinator = await mountCoordinator();
		const returnedForm = await mountForm();
		const returnedReview = returnedForm.getByRole('button', { name: en.swap.text.review_button });
		await advance();

		expect(rounds).toHaveLength(2);
		expect(get(activity)).toBeUndefined();
		expect(returnedReview).toBeEnabled();

		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);
		const background = get(activity);
		await accept({ index: 1, offers: [mockSwapProviders[0]] });

		expect(background).toMatchObject({ pending: true, background: true });
		expect(get(activity)).toBe(background);
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);
		expect(returnedReview).toBeEnabled();

		const rankedOffers = [mockSwapProviders[1], mockSwapProviders[0]];
		await accept({ index: 2, offers: rankedOffers });

		expect(get(activity)).toMatchObject({ pending: false, background: true });
		expect(get(store)?.swaps).toEqual(rankedOffers);
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);
		expect(get(store)?.manuallySelectedProviderKey).toBe(mockSwapProviders[1].provider);
		expect(returnedReview).toBeEnabled();

		returnedForm.unmount();
		returnedCoordinator.unmount();
	});
});
