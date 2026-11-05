import SwapProviderCell from '$lib/components/swap/SwapProvider.svelte';
import {
	SWAP_PROVIDER_ANIMATION,
	SWAP_PROVIDER_CELL,
	SWAP_PROVIDER_STATUS
} from '$lib/constants/test-ids.constants';
import { MOTION_SWAP_DURATION } from '$lib/constants/transition.constants';
import { screensStore } from '$lib/stores/screens.store';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockNearIntentsProvider,
	mockOneSecProvider,
	mockVeloraMarketProvider
} from '$tests/mocks/swap.mocks';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSwapContext, mockSwapContextEntry } from '$tests/utils/swap.context.test-utils';
import { isNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable } from 'svelte/store';
import type { MockInstance } from 'vitest';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('svelte/motion', () => ({
	prefersReducedMotion: {
		get current() {
			return motion.reduced;
		}
	}
}));

// Ignore pre-existing ModalValue/Logo entry fades; only inspect the new provider motion.
const providerAnimationCalls = (animate: MockInstance<Element['animate']>) =>
	animate.mock.calls.filter((_, index) => {
		const node = animate.mock.contexts[index];
		return (
			node instanceof Element && node.matches('.provider-layer, .provider-stack, .provider-content')
		);
	});

// The confirmation squeeze is the only provider motion that scales.
const confirmationPops = (animate: MockInstance<Element['animate']>) =>
	animate.mock.calls.filter(
		([frames]) =>
			Array.isArray(frames) &&
			frames.some(
				(frame) => typeof frame.transform === 'string' && frame.transform.includes('scale')
			)
	);

// The status region repeats the visible label for screen readers; label assertions skip it.
const visibleOnly = { ignore: 'script, style, .sr-only' };

const offer: SwapMappedResult = {
	provider: SwapProvider.ICP_SWAP,
	receiveAmount: 100_000_000n,
	receiveOutMinimum: 99_000_000n,
	swapDetails: { receiveAmount: 100_000_000n }
};

// Half a token apart (8 decimals), so the gain is $1.00 at a rate of 2.
const bestOffer: SwapMappedResult = { ...mockNearIntentsProvider, receiveAmount: 150_000_000n };
const lowestOffer: SwapMappedResult = { ...mockOneSecProvider, receiveAmount: 100_000_000n };

const bestOfTwoOffers = replacePlaceholders(en.swap.text.smart_swap_best_of_offers, {
	$count: '2'
});
const twoOffersCompared = replacePlaceholders(en.swap.text.smart_swap_offers_compared, {
	$count: '2'
});
// The gain sentence around its amount, which is a separate, coloured element.
const gainSentence = new RegExp(
	en.swap.text.smart_swap_gain
		.split('$amount')[1]
		.trim()
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

describe('SwapProvider form cell', () => {
	const store = initSwapAmountsStore();
	const activity = initSwapQuoteActivityStore();
	const context = mockContextMap([
		[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
		mockSwapContextEntry({ sourceToken: mockValidIcToken, destinationToken: mockValidIcToken })
	]);
	// The test exchange store has no rates, so the default context never shows a gain.
	const contextWithRate = (destinationTokenExchangeRate: number) =>
		mockContextMap([
			[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
			[
				SWAP_CONTEXT_KEY,
				{
					...mockSwapContext({ sourceToken: mockValidIcToken, destinationToken: mockValidIcToken }),
					destinationTokenExchangeRate: readable(destinationTokenExchangeRate)
				}
			]
		]);
	const props = {
		isForm: true,
		slippageValue: '0.5',
		onShowProviderList: vi.fn()
	};

	beforeEach(() => {
		motion.reduced = false;
		store.reset();
		activity.reset();
		screensStore.set('md');
		vi.clearAllMocks();
	});

	afterEach(() => vi.useRealTimers());

	it("draws the form's one separator under the cell, and none without a cell", async () => {
		const { container, getByTestId } = render(SwapProviderCell, { props, context });

		// No offer and no round: the fee row has nothing above it to separate from.
		expect(container.querySelector('hr')).toBeNull();

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		await tick();

		const separator = container.querySelector('hr');

		expect(separator).not.toBeNull();
		expect(getByTestId(SWAP_PROVIDER_CELL).nextElementSibling).toBe(separator);
	});

	it('runs the thinking shimmer and the border beam only while a foreground round compares', async () => {
		activity.start({ requestId: 30, background: false });
		activity.addProvider({ requestId: 30, provider: SwapProvider.ICP_SWAP });
		const { getByTestId, getByText } = render(SwapProviderCell, { props, context });
		await tick();

		const beam = getByTestId(SWAP_PROVIDER_CELL).querySelector('.smart-beam');

		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toHaveClass('smart-thinking');
		expect(getByText(en.swap.text.smart_swap)).toHaveClass('smart-thinking');
		expect(beam).toHaveClass('beaming');
		expect(beam).toHaveAttribute('aria-hidden', 'true');

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 30 });
		await tick();
		await tick();

		expect(document.querySelector('.smart-thinking')).toBeNull();
		// Still in the card, so it fades out and the next round carries on from where it stopped.
		expect(beam).toBeInTheDocument();
		expect(beam).not.toHaveClass('beaming');
	});

	it('keeps the title plain under reduced motion while the status line falls back to grey', async () => {
		motion.reduced = true;
		activity.start({ requestId: 32, background: false });
		activity.addProvider({ requestId: 32, provider: SwapProvider.ICP_SWAP });
		const { getByText } = render(SwapProviderCell, { props, context });
		await tick();

		expect(getByText(en.swap.text.smart_swap)).not.toHaveClass('smart-thinking');
		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toHaveClass('smart-thinking');
	});

	it('plays no colour effect on the title when the best rate is confirmed', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		activity.start({ requestId: 31, background: false });
		activity.addProvider({ requestId: 31, provider: SwapProvider.ICP_SWAP });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByText } = render(SwapProviderCell, { props, context });
		await tick();

		activity.complete({ requestId: 31 });
		await tick();
		await tick();

		const title = getByText(en.swap.text.smart_swap);

		expect(animate.mock.contexts).not.toContain(title);
		expect(title.className).not.toMatch(/smart-/);
	});

	it('announces the comparison and the provider it picks from one region outside the cell', async () => {
		vi.useFakeTimers();
		const { container, getByTestId, getByText } = render(SwapProviderCell, { props, context });
		const status = getByTestId(SWAP_PROVIDER_STATUS);

		// Mounted empty before any round, so the first change is heard.
		expect(status).toHaveAttribute('role', 'status');
		expect(status.textContent).toBe('');

		activity.start({ requestId: 10, background: false });
		activity.addProvider({ requestId: 10, provider: SwapProvider.ICP_SWAP });
		activity.addProvider({ requestId: 10, provider: SwapProvider.ONE_SEC });
		await tick();

		expect(status).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toHaveAttribute(
			'aria-hidden',
			'true'
		);
		// The cell is a button, whose children are presentational.
		expect(status.closest('button')).toBeNull();
		expect(container.querySelectorAll('button [role="status"], button [aria-live]')).toHaveLength(
			0
		);

		await vi.advanceTimersByTimeAsync(650);

		const loop = getByTestId(SWAP_PROVIDER_ANIMATION);

		// Cycling candidates are never spoken, by the region or by the scroll.
		expect(loop).toHaveAttribute('data-provider', SwapProvider.ONE_SEC);
		expect(status).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(loop.querySelector('.sr-only')?.textContent).toBe('');

		for (const layer of loop.querySelectorAll('[data-provider-layer]')) {
			expect(layer).toHaveAttribute('aria-hidden', 'true');
		}

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 10 });
		await tick();
		await tick();

		expect(status).toHaveTextContent('ICPSwap');
		// The scroll keeps the name as plain text, for the cell's accessible name.
		expect(loop.querySelector('.sr-only')).toHaveTextContent('ICPSwap');
		expect(getByTestId(SWAP_PROVIDER_CELL)).toHaveAccessibleName(/ICPSwap/);

		activity.start({ requestId: 11, background: false });
		await tick();

		expect(status).toHaveTextContent(en.swap.text.finding_best_rate);
	});

	it('does not re-announce the status when a keystroke replaces the round', async () => {
		activity.start({ requestId: 20, background: false });
		const { getByTestId } = render(SwapProviderCell, { props, context });
		const status = getByTestId(SWAP_PROVIDER_STATUS);
		const changes: MutationRecord[] = [];
		const observer = new MutationObserver((records) => changes.push(...records));
		observer.observe(status, { childList: true, characterData: true, subtree: true });

		// The coordinator invalidates and restarts a round in one synchronous step.
		activity.reset();
		activity.start({ requestId: 21, background: false });
		await tick();
		observer.disconnect();

		expect(status).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(changes).toHaveLength(0);
	});

	it('allows provider names to use the remaining cell width', () => {
		store.setSwaps({
			swaps: [mockNearIntentsProvider, mockOneSecProvider],
			selectedProvider: mockNearIntentsProvider,
			amountForSwap: '1'
		});
		const { getByTestId, getByText } = render(SwapProviderCell, { props, context });
		const providerGroup = getByTestId(SWAP_PROVIDER_ANIMATION).parentElement;
		const title = getByText(en.swap.text.smart_swap);

		expect(providerGroup).not.toHaveClass('shrink-0');
		expect(providerGroup).toHaveClass('min-w-0');
		expect(providerGroup).not.toHaveClass('min-w-24');
		expect(providerGroup).not.toHaveClass('max-[24.375rem]:max-w-24');
		// The title alone sets the label column's minimum width.
		expect(title).toHaveClass('whitespace-nowrap');
		expect(title.parentElement).toHaveClass('flex-auto');
	});

	it('opens the provider list from the cell without submitting or showing details', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		const { getByTestId, queryByText } = render(SwapProviderCell, { props, context });
		const cell = getByTestId(SWAP_PROVIDER_CELL);

		expect(cell).toHaveAttribute('type', 'button');
		expect(cell).toBeEnabled();

		await fireEvent.click(cell);

		expect(props.onShowProviderList).toHaveBeenCalledOnce();
		// The details live in the provider list step, not under the cell.
		expect(queryByText(en.swap.text.swap_provider_website)).not.toBeInTheDocument();
	});

	it('disables the cell while a foreground comparison runs and enables it after', async () => {
		const offers = [offer, mockOneSecProvider];
		store.setSwaps({ swaps: offers, selectedProvider: offer, amountForSwap: '1' });
		const { getByTestId, getByText } = render(SwapProviderCell, { props, context });
		const cell = getByTestId(SWAP_PROVIDER_CELL);

		expect(cell).toBeEnabled();
		// A grey card at rest; the rows' blue answers hover and press only while it can be tapped.
		expect(cell).toHaveClass('bg-secondary', 'hover:bg-brand-subtle-10');

		activity.start({ requestId: 2, background: false });
		await tick();

		// The selected provider's details would describe a stale offer meanwhile.
		expect(cell).toBeDisabled();
		expect(cell).toHaveClass('bg-secondary');
		expect(cell).not.toHaveClass('hover:bg-brand-subtle-10');

		// A tap lands on the content: jsdom, unlike a browser, still dispatches a click on the
		// disabled button itself.
		await fireEvent.click(getByText(en.swap.text.smart_swap));

		expect(props.onShowProviderList).not.toHaveBeenCalled();

		store.setSwaps({ swaps: offers, selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 2 });
		await tick();

		expect(getByTestId(SWAP_PROVIDER_CELL)).toBe(cell);
		expect(cell).toBeEnabled();

		await fireEvent.click(getByText(en.swap.text.smart_swap));

		expect(props.onShowProviderList).toHaveBeenCalledOnce();
	});

	it('disables the cell without onShowProviderList', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		const { getByTestId, getByText } = render(SwapProviderCell, {
			props: { ...props, onShowProviderList: undefined },
			context
		});
		const cell = getByTestId(SWAP_PROVIDER_CELL);

		expect(cell).toBeDisabled();

		await fireEvent.click(getByText(en.swap.text.smart_swap));

		expect(props.onShowProviderList).not.toHaveBeenCalled();
	});

	it('shows the estimated gain over the lowest quote when the rate is known', () => {
		store.setSwaps({
			swaps: [bestOffer, lowestOffer],
			selectedProvider: bestOffer,
			amountForSwap: '1'
		});
		const { getByTestId, getByText, queryByText } = render(SwapProviderCell, {
			props,
			context: contextWithRate(2)
		});

		// One translatable sentence; only the amount stands out, in the primary text colour.
		expect(getByTestId(SWAP_PROVIDER_CELL)).toHaveTextContent(
			replacePlaceholders(en.swap.text.smart_swap_gain, { $amount: '+$1.00' })
		);
		expect(getByText('+$1.00')).toHaveClass('text-primary');
		expect(queryByText(bestOfTwoOffers)).not.toBeInTheDocument();
		// The line already says the pick beat the other quotes, so the form has no Best Rate badge.
		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
	});

	it('does not present a manual pick between the best and the lowest offer as a gain', () => {
		const middleOffer: SwapMappedResult = {
			...mockVeloraMarketProvider,
			receiveAmount: 125_000_000n
		};
		store.setSwaps({
			swaps: [bestOffer, middleOffer, lowestOffer],
			selectedProvider: bestOffer,
			amountForSwap: '1'
		});
		store.setManualProvider(middleOffer);
		const { getByText, queryByText } = render(SwapProviderCell, {
			props,
			context: contextWithRate(2)
		});

		expect(
			getByText(replacePlaceholders(en.swap.text.smart_swap_offers_compared, { $count: '3' }))
		).toBeInTheDocument();
		expect(queryByText(gainSentence)).not.toBeInTheDocument();
	});

	it.each([
		{ reason: 'without an exchange rate', rate: undefined },
		// Half a token at $0.01 is half a cent.
		{ reason: 'below one cent of gain', rate: 0.01 }
	])('shows the best of the offers instead of a gain $reason', ({ rate }) => {
		store.setSwaps({
			swaps: [bestOffer, lowestOffer],
			selectedProvider: bestOffer,
			amountForSwap: '1'
		});
		const { getByText, queryByText } = render(SwapProviderCell, {
			props,
			context: isNullish(rate) ? context : contextWithRate(rate)
		});

		expect(getByText(bestOfTwoOffers)).toBeInTheDocument();
		expect(queryByText(gainSentence)).not.toBeInTheDocument();
	});

	it('counts the compared offers for a manual non-best selection', () => {
		store.setSwaps({
			swaps: [bestOffer, lowestOffer],
			selectedProvider: bestOffer,
			amountForSwap: '1'
		});
		store.setManualProvider(lowestOffer);
		const { getByText, queryByText } = render(SwapProviderCell, {
			props,
			context: contextWithRate(2)
		});

		expect(getByText(twoOffersCompared)).toBeInTheDocument();
		expect(queryByText(gainSentence)).not.toBeInTheDocument();
	});

	it('does not replay confirmation when a completed cell disappears and mounts again', async () => {
		activity.start({ requestId: 9, background: false });
		activity.addProvider({ requestId: 9, provider: SwapProvider.ICP_SWAP });
		const animate = vi.spyOn(Element.prototype, 'animate');
		render(SwapProviderCell, { props, context });
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 9 });
		await tick();
		await tick();
		store.reset();
		await tick();
		await tick();
		animate.mockClear();

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		await tick();
		await tick();

		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it('does not replay a completed request on initial mount or form remount', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		activity.start({ requestId: 1, background: false });
		activity.complete({ requestId: 1 });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const first = render(SwapProviderCell, { props, context });
		await tick();
		await tick();

		expect(first.getByText(bestOfTwoOffers)).toBeInTheDocument();
		expect(providerAnimationCalls(animate)).toHaveLength(0);

		first.unmount();
		const second = render(SwapProviderCell, { props, context });
		await tick();
		await tick();

		expect(second.getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.ICP_SWAP
		);
		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it('keeps a completed snapshot quiet when request IDs restart after activity reset', async () => {
		vi.useFakeTimers();
		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.ICP_SWAP });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByTestId } = render(SwapProviderCell, { props, context });
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 1 });
		await tick();
		await vi.advanceTimersByTimeAsync(300);
		activity.reset();
		await tick();
		await tick();
		animate.mockClear();

		// A new coordinator can reuse 1; a completed snapshot is not an observed pending round.
		activity.start({ requestId: 1, background: false });
		store.setSwaps({
			swaps: [mockOneSecProvider],
			selectedProvider: mockOneSecProvider,
			amountForSwap: '1'
		});
		activity.complete({ requestId: 1 });
		await tick();
		await tick();

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.ONE_SEC
		);
		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it.each([false, true])(
		'keeps five-second background refreshes quiet (manual selection: %s)',
		async (manual) => {
			vi.useFakeTimers();
			store.setSwaps({
				swaps: [offer, mockOneSecProvider],
				selectedProvider: offer,
				amountForSwap: '1'
			});
			if (manual) {
				store.setManualProvider(offer);
			}
			const animate = vi.spyOn(Element.prototype, 'animate');
			const { getByTestId, queryByText } = render(SwapProviderCell, { props, context });
			await tick();
			await tick();
			animate.mockClear();
			for (const requestId of [2, 3]) {
				activity.start({ requestId, background: true });
				activity.addProvider({ requestId, provider: SwapProvider.ONE_SEC });
				activity.addProvider({ requestId, provider: SwapProvider.ICP_SWAP });
				await vi.advanceTimersByTimeAsync(5000);

				expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();

				store.setSwaps({
					swaps: [mockOneSecProvider, offer],
					selectedProvider: mockOneSecProvider,
					amountForSwap: '1'
				});
				activity.complete({ requestId });
				await tick();
				await tick();

				expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
					'data-provider',
					manual ? SwapProvider.ICP_SWAP : SwapProvider.ONE_SEC
				);
				expect(providerAnimationCalls(animate)).toHaveLength(0);
			}
		}
	);

	it('preserves a manually selected non-best offer without confirming it as a winner', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		store.setManualProvider(mockOneSecProvider);
		activity.start({ requestId: 5, background: false });
		activity.addProvider({ requestId: 5, provider: SwapProvider.ICP_SWAP });
		const { getByTestId, findByText } = render(SwapProviderCell, { props, context });
		const animate = vi.spyOn(Element.prototype, 'animate');
		await tick();
		await tick();
		animate.mockClear();
		activity.complete({ requestId: 5 });
		await tick();
		await tick();

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.ONE_SEC
		);
		expect(providerAnimationCalls(animate)).toHaveLength(0);
		// The result line fades in once the status has faded out of the cell.
		await expect(findByText(twoOffersCompared)).resolves.toBeInTheDocument();
	});

	it('removes an empty completed comparison instead of leaving a blank clickable cell', async () => {
		activity.start({ requestId: 6, background: false });
		const { queryByTestId } = render(SwapProviderCell, { props, context });
		activity.complete({ requestId: 6 });

		// The row closes with its height before it leaves the DOM.
		await waitFor(() => {
			expect(queryByTestId(SWAP_PROVIDER_CELL)).not.toBeInTheDocument();
			expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();
		});
	});

	it('does not confirm a result published after an empty completion', async () => {
		activity.start({ requestId: 7, background: false });
		render(SwapProviderCell, { props, context });
		activity.complete({ requestId: 7 });
		await tick();
		const animate = vi.spyOn(Element.prototype, 'animate');
		animate.mockClear();
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		await tick();
		await tick();

		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it('leaves the default Review label and details unchanged during quote activity', async () => {
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.start({ requestId: 8, background: false });
		const { getByText, queryByText, queryByTestId, getByTestId } = render(SwapProviderCell, {
			props: { slippageValue: '0.5' },
			context
		});

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
		expect(queryByText(en.swap.text.smart_swap)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_CELL)).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('collapsible-header'));

		expect(getByTestId('collapsible-content')).toHaveClass('expanded');
		expect(getByText(en.swap.text.swap_provider_website)).toBeInTheDocument();
	});

	it.each([false, true])(
		'retains the settled outgoing provider while recalling a foreground winner (reduced: %s)',
		async (reduced) => {
			motion.reduced = reduced;
			vi.useFakeTimers();
			activity.start({ requestId: 11, background: false });
			const providers = reduced
				? [SwapProvider.VELORA, SwapProvider.NEAR_INTENTS]
				: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI];
			for (const provider of providers) {
				activity.addProvider({ requestId: 11, provider });
			}
			const animate = vi.spyOn(Element.prototype, 'animate');
			const { getByTestId } = render(SwapProviderCell, { props, context });
			await vi.advanceTimersByTimeAsync(1550);
			const loop = getByTestId(SWAP_PROVIDER_ANIMATION);
			const previous = loop.querySelector('[data-provider-layer="current"]');

			expect(previous).toHaveAttribute(
				'data-provider',
				reduced ? SwapProvider.VELORA : SwapProvider.LIFI
			);
			expect(loop.querySelectorAll('[data-provider-layer]')).toHaveLength(1);

			animate.mockClear();
			await Promise.resolve().then(() => {
				store.setSwaps({
					swaps: [mockNearIntentsProvider],
					selectedProvider: mockNearIntentsProvider,
					amountForSwap: '1'
				});
				activity.complete({ requestId: 11 });
			});
			await tick();
			await tick();

			expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toBe(loop);
			expect(loop).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);
			expect(loop.querySelector('[data-provider-layer="outgoing"]')).toBe(previous);
			expect(loop.querySelectorAll('[data-provider-layer]')).toHaveLength(2);

			const calls = providerAnimationCalls(animate);

			expect(
				calls.map(([, options]) => (typeof options === 'object' ? options.duration : options))
			).toEqual(reduced ? [100, 100] : expect.arrayContaining([150, 200, 250]));

			if (reduced) {
				for (const [frames] of calls) {
					expect(
						Array.isArray(frames) &&
							frames.every((frame) => Object.keys(frame).join() === 'opacity')
					).toBeTruthy();
				}
			}

			await vi.advanceTimersByTimeAsync(1000);

			expect(previous).not.toBeInTheDocument();
			expect(loop.querySelectorAll('[data-provider-layer]')).toHaveLength(1);
			expect(loop).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);
		}
	);

	it('confirms an observed foreground completion only once', async () => {
		vi.useFakeTimers();
		activity.start({ requestId: 3, background: false });
		activity.addProvider({ requestId: 3, provider: SwapProvider.ICP_SWAP });
		activity.addProvider({ requestId: 3, provider: SwapProvider.ONE_SEC });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByTestId, queryByText } = render(SwapProviderCell, { props, context });
		const loop = getByTestId(SWAP_PROVIDER_ANIMATION);
		await vi.advanceTimersByTimeAsync(650);

		expect(loop).toHaveAttribute('data-provider', SwapProvider.ONE_SEC);

		animate.mockClear();

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 3 });
		await tick();
		await tick();

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toBe(loop);
		expect(loop).toHaveAttribute('data-provider', SwapProvider.ICP_SWAP);

		// The status fades out, then the single offer's line leaves with its height.
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();

		expect(confirmationPops(animate)).toHaveLength(1);

		animate.mockClear();
		store.setSelectedProvider(offer);
		await tick();
		await tick();

		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it('mounts the comparing cell before an offer exists', () => {
		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.ICP_SWAP });
		const { getByText, getByTestId } = render(SwapProviderCell, { props, context });
		const cell = getByTestId(SWAP_PROVIDER_CELL);
		const title = getByText(en.swap.text.smart_swap);

		// The status takes the line under the title; the scroll sits in the right column.
		expect(cell).toContainElement(title);
		expect(title.nextElementSibling).toContainElement(
			getByText(en.swap.text.finding_best_rate, visibleOnly)
		);
		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.ICP_SWAP
		);
		expect(getByTestId(SWAP_PROVIDER_ANIMATION).parentElement).toHaveClass('items-end');
		expect(cell).toBeDisabled();
	});

	it('truncates the comparing status before the provider scroll gives up its room', () => {
		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.ICP_SWAP });
		const { getByText, getByTestId } = render(SwapProviderCell, { props, context });
		const scrollGroup = getByTestId(SWAP_PROVIDER_ANIMATION).parentElement;
		const status = getByText(en.swap.text.finding_best_rate, visibleOnly);

		// Zero basis: the status line no longer counts toward the label column's min-content.
		expect(status).toHaveClass('truncate');
		expect(status.parentElement).toHaveClass('w-0', 'min-w-full');
		expect(scrollGroup).toHaveClass('min-w-24');
		expect(scrollGroup).not.toHaveClass('min-w-0');
		// Below 390 px (24.375rem) the slot is fixed, so a long name cannot shorten the status.
		expect(scrollGroup).toHaveClass('max-[24.375rem]:max-w-24');
	});

	it('fades the labels through instead of swapping them in one frame', async () => {
		vi.useFakeTimers();
		const offers = [offer, { ...offer, receiveAmount: 2n }];
		store.setSwaps({ swaps: offers, selectedProvider: offer, amountForSwap: '1' });
		const { getByText, queryByText } = render(SwapProviderCell, { props, context });
		const resultLine = getByText(bestOfTwoOffers).parentElement;

		activity.start({ requestId: 12, background: false });
		await tick();

		// Fading out in place: still laid out, transparent, and no status beside it yet.
		expect(resultLine).toHaveClass('opacity-0');
		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION);

		expect(resultLine).not.toBeInTheDocument();
		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).not.toHaveClass('opacity-0');

		store.setSwaps({ swaps: offers, selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 12 });
		await tick();

		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toHaveClass('opacity-0');

		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION);

		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();
		expect(getByText(bestOfTwoOffers).parentElement).not.toHaveClass('opacity-0');
	});

	it('retargets an interrupted label fade without re-laying out the cell', async () => {
		vi.useFakeTimers();
		const offers = [offer, { ...offer, receiveAmount: 2n }];
		store.setSwaps({ swaps: offers, selectedProvider: offer, amountForSwap: '1' });
		const { getByText, queryByText } = render(SwapProviderCell, { props, context });
		const resultLine = getByText(bestOfTwoOffers).parentElement;

		activity.start({ requestId: 13, background: false });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION / 3);
		activity.complete({ requestId: 13 });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION * 2);

		expect(resultLine).toBeInTheDocument();
		expect(resultLine).not.toHaveClass('opacity-0');
		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();
	});

	it('opens the row with its height and keeps the gap to the next row inside it', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		// jsdom does no layout, and Svelte's slide leaves out a height it can't measure, so the
		// row reports the height a browser would.
		const measure = globalThis.getComputedStyle.bind(globalThis);
		const computedStyle = vi
			.spyOn(globalThis, 'getComputedStyle')
			.mockImplementation((element) =>
				element.classList.contains('pb-3')
					? ({ opacity: '1', height: '40px' } as CSSStyleDeclaration)
					: measure(element)
			);
		const { getByTestId } = render(SwapProviderCell, { props, context });
		activity.start({ requestId: 14, background: false });
		await tick();
		await tick();
		computedStyle.mockRestore();
		const row = getByTestId(SWAP_PROVIDER_CELL).closest('.pb-3');
		const heights = animate.mock.calls.filter(
			([frames], index) =>
				animate.mock.contexts[index] === row &&
				Array.isArray(frames) &&
				frames.some((frame) => 'height' in frame)
		);

		expect(row).not.toBeNull();
		expect(heights.length).toBeGreaterThan(0);
	});

	it('shows the status with the row when there is no label to fade out first', async () => {
		vi.useFakeTimers();
		const { getByText } = render(SwapProviderCell, { props, context });

		activity.start({ requestId: 15, background: false });
		await tick();

		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).not.toHaveClass('opacity-0');
	});

	it('shows a single offer as one row, with no line under the title and no Best Rate', () => {
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByTestId, queryByText } = render(SwapProviderCell, {
			props,
			context: contextWithRate(2)
		});
		const cell = getByTestId(SWAP_PROVIDER_CELL);

		expect(cell).toHaveTextContent(en.swap.text.smart_swap);
		expect(cell).toHaveAccessibleName(/ICPSwap/);
		expect(cell).not.toHaveTextContent(gainSentence);
		expect(cell).not.toHaveTextContent(/offer/i);
		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
	});

	it('shrinks the first round to one row when it finds a single offer', async () => {
		vi.useFakeTimers();
		const { getByTestId, getByText, queryByText } = render(SwapProviderCell, {
			props,
			context
		});

		activity.start({ requestId: 17, background: false });
		await tick();

		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toBeInTheDocument();

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 17 });
		await tick();
		// The status fades out in place, then the line leaves with its height.
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
		// No offer count either: "Best of 1 offers" would say nothing.
		expect(getByTestId(SWAP_PROVIDER_CELL)).not.toHaveTextContent(/offer/i);
	});

	it('keeps a single offer one row while the same pair re-quotes', async () => {
		vi.useFakeTimers();
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByTestId, queryByText } = render(SwapProviderCell, { props, context });

		activity.start({ requestId: 18, background: false });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		// The provider scroll shows the round; screen readers still hear the status.
		expect(queryByText(en.swap.text.finding_best_rate, visibleOnly)).not.toBeInTheDocument();
		expect(getByTestId(SWAP_PROVIDER_STATUS)).toHaveTextContent(en.swap.text.finding_best_rate);

		activity.complete({ requestId: 18 });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
	});

	it('grows back to two lines when a later round finds more offers', async () => {
		vi.useFakeTimers();
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByText } = render(SwapProviderCell, { props, context });

		activity.start({ requestId: 19, background: false });
		await tick();
		store.setSwaps({
			swaps: [offer, { ...offer, receiveAmount: 2n }],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		activity.complete({ requestId: 19 });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		expect(getByText(bestOfTwoOffers)).toBeInTheDocument();
	});

	it('starts a new pair with the status under the title again', async () => {
		vi.useFakeTimers();
		const swapContext = mockSwapContext({
			sourceToken: mockValidIcToken,
			destinationToken: mockValidIcToken
		});
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByText } = render(SwapProviderCell, {
			props,
			context: mockContextMap([
				[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
				[SWAP_CONTEXT_KEY, swapContext]
			])
		});

		swapContext.setDestinationToken({ ...mockValidIcToken, id: parseTokenId('OtherIcrcTokenId') });
		activity.start({ requestId: 20, background: false });
		await tick();
		await vi.advanceTimersByTimeAsync(MOTION_SWAP_DURATION + 1_000);

		expect(getByText(en.swap.text.finding_best_rate, visibleOnly)).toBeInTheDocument();
	});

	it('shows Best Rate on Review for a single offer', () => {
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByText } = render(SwapProviderCell, {
			props: { slippageValue: '0.5' },
			context
		});

		expect(getByText(en.swap.text.best_rate)).toBeInTheDocument();
	});
});
