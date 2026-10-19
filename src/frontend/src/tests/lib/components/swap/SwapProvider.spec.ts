import SwapProviderHeader from '$lib/components/swap/SwapProvider.svelte';
import { SWAP_PROVIDER_ANIMATION } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockNearIntentsProvider, mockOneSecProvider } from '$tests/mocks/swap.mocks';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSwapContextEntry } from '$tests/utils/swap.context.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
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

const offer: SwapMappedResult = {
	provider: SwapProvider.ICP_SWAP,
	receiveAmount: 100_000_000n,
	receiveOutMinimum: 99_000_000n,
	swapDetails: { receiveAmount: 100_000_000n }
};

describe('SwapProvider form header', () => {
	const store = initSwapAmountsStore();
	const activity = initSwapQuoteActivityStore();
	const context = mockContextMap([
		[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
		mockSwapContextEntry({ sourceToken: mockValidIcToken, destinationToken: mockValidIcToken })
	]);
	const props = {
		isForm: true,
		slippageValue: '0.5',
		showSelectButton: true,
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

	it('announces only the canonical ready selection, not cycling candidates', async () => {
		vi.useFakeTimers();
		activity.start({ requestId: 10, background: false });
		activity.addProvider({ requestId: 10, provider: SwapProvider.ICP_SWAP });
		activity.addProvider({ requestId: 10, provider: SwapProvider.ONE_SEC });
		const { getByTestId } = render(SwapProviderHeader, { props, context });
		const loop = getByTestId(SWAP_PROVIDER_ANIMATION);

		expect(loop).toHaveAttribute('role', 'status');
		expect(loop.querySelector('.sr-only')?.textContent).toBe('');

		await vi.advanceTimersByTimeAsync(650);

		expect(loop).toHaveAttribute('data-provider', SwapProvider.ONE_SEC);
		expect(loop.querySelector('.sr-only')?.textContent).toBe('');

		for (const layer of loop.querySelectorAll('[data-provider-layer]')) {
			expect(layer).toHaveAttribute('aria-hidden', 'true');
		}

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.complete({ requestId: 10 });
		await tick();
		await tick();

		const canonical = loop.querySelector('.sr-only');

		expect(canonical).toHaveTextContent('ICPSwap');
		expect(canonical?.closest('[aria-hidden="true"]')).toBeNull();
	});

	it('opens manual selection without submitting or opening provider details', async () => {
		store.setSwaps({
			swaps: [offer, mockOneSecProvider],
			selectedProvider: offer,
			amountForSwap: '1'
		});
		const { getByRole, getByTestId } = render(SwapProviderHeader, { props, context });
		const select = getByRole('button', { name: en.swap.text.select });

		expect(select).toHaveAttribute('type', 'button');

		await fireEvent.click(select);

		expect(props.onShowProviderList).toHaveBeenCalledExactlyOnceWith();
		expect(getByTestId('collapsible-content')).not.toHaveClass('expanded');
	});

	it('does not replay confirmation when a completed header disappears and mounts again', async () => {
		activity.start({ requestId: 9, background: false });
		activity.addProvider({ requestId: 9, provider: SwapProvider.ICP_SWAP });
		const animate = vi.spyOn(Element.prototype, 'animate');
		render(SwapProviderHeader, { props, context });
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
		const first = render(SwapProviderHeader, { props, context });
		await tick();
		await tick();

		expect(first.getByText(en.swap.text.best_rate)).toBeInTheDocument();
		expect(providerAnimationCalls(animate)).toHaveLength(0);

		first.unmount();
		const second = render(SwapProviderHeader, { props, context });
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
		const { getByTestId } = render(SwapProviderHeader, { props, context });
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
			const { getByTestId, queryByText } = render(SwapProviderHeader, { props, context });
			await tick();
			await tick();
			animate.mockClear();
			for (const requestId of [2, 3]) {
				activity.start({ requestId, background: true });
				activity.addProvider({ requestId, provider: SwapProvider.ONE_SEC });
				activity.addProvider({ requestId, provider: SwapProvider.ICP_SWAP });
				await vi.advanceTimersByTimeAsync(5000);

				expect(queryByText(en.swap.text.comparing_providers)).not.toBeInTheDocument();

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
		const { getByTestId, queryByText, getByText } = render(SwapProviderHeader, { props, context });
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
		expect(queryByText(en.swap.text.best_rate)).not.toBeInTheDocument();
		expect(getByText(en.swap.text.select)).toBeInTheDocument();
		expect(providerAnimationCalls(animate)).toHaveLength(0);
	});

	it('removes an empty completed comparison instead of leaving a blank clickable disclosure', async () => {
		activity.start({ requestId: 6, background: false });
		const { queryByTestId } = render(SwapProviderHeader, { props, context });
		activity.complete({ requestId: 6 });
		await tick();
		await tick();

		expect(queryByTestId('collapsible-header')).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();
	});

	it('does not confirm a result published after an empty completion', async () => {
		activity.start({ requestId: 7, background: false });
		render(SwapProviderHeader, { props, context });
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
		const { getByText, queryByText, queryByTestId, getByTestId } = render(SwapProviderHeader, {
			props: { slippageValue: '0.5' },
			context
		});

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
		expect(queryByText(en.swap.text.smart_swap)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.comparing_providers)).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('collapsible-header'));

		expect(getByTestId('collapsible-content')).toHaveClass('expanded');
		expect(getByText(en.swap.text.swap_provider_website)).toBeInTheDocument();
	});

	it.each(
		(['md', 'xs'] as const).flatMap((screen) =>
			[false, true].map((reduced) => ({ screen, reduced }))
		)
	)(
		'retains the settled outgoing provider while recalling a foreground winner on $screen (reduced: $reduced)',
		async ({ screen, reduced }) => {
			screensStore.set(screen);
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
			const { getByTestId } = render(SwapProviderHeader, { props, context });
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

	it.each(['md', 'xs'] as const)(
		'confirms an observed foreground completion only once on %s',
		async (screen) => {
			screensStore.set(screen);
			vi.useFakeTimers();
			activity.start({ requestId: 3, background: false });
			activity.addProvider({ requestId: 3, provider: SwapProvider.ICP_SWAP });
			activity.addProvider({ requestId: 3, provider: SwapProvider.ONE_SEC });
			const animate = vi.spyOn(Element.prototype, 'animate');
			const { getByTestId, queryByText, getByLabelText } = render(SwapProviderHeader, {
				props,
				context
			});
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
			expect(queryByText(en.swap.text.comparing_providers)).not.toBeInTheDocument();

			const pops = animate.mock.calls.filter(
				([frames]) =>
					Array.isArray(frames) &&
					frames.some(
						(frame) => typeof frame.transform === 'string' && frame.transform.includes('scale')
					)
			);

			expect(pops).toHaveLength(1);

			animate.mockClear();
			store.setSelectedProvider(offer);
			await tick();
			await tick();

			expect(providerAnimationCalls(animate)).toHaveLength(0);

			if (screen === 'xs') {
				await fireEvent.click(getByLabelText(en.core.alt.open_details));
				await tick();
				await tick();

				expect(
					animate.mock.calls.filter(
						([frames]) =>
							Array.isArray(frames) &&
							frames.some(
								(frame) => typeof frame.transform === 'string' && frame.transform.includes('scale')
							)
					)
				).toHaveLength(0);
			}
		}
	);

	it.each(['md', 'xs'] as const)(
		'closes already-open details when foreground comparison starts on %s',
		async (screen) => {
			screensStore.set(screen);
			store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
			const { getByLabelText, getByTestId, queryByTestId } = render(SwapProviderHeader, {
				props,
				context
			});
			await fireEvent.click(
				screen === 'md'
					? getByTestId('collapsible-header')
					: getByLabelText(en.core.alt.open_details)
			);
			if (screen === 'md') {
				expect(getByTestId('collapsible-content')).toHaveClass('expanded');
			} else {
				expect(getByTestId('bottom-sheet')).toBeInTheDocument();
			}

			activity.start({ requestId: 4, background: false });
			await tick();

			if (screen === 'md') {
				expect(getByTestId('collapsible-content')).not.toHaveClass('expanded');
			} else {
				await waitFor(() => expect(queryByTestId('bottom-sheet')).not.toBeInTheDocument());
			}
		}
	);

	it.each(['md', 'xs'] as const)(
		'suppresses stale details and disables disclosure during comparison on %s',
		async (screen) => {
			screensStore.set(screen);
			store.setSwaps({
				swaps: [offer, { ...offer, receiveAmount: 2n }],
				selectedProvider: offer,
				amountForSwap: '1'
			});
			const { queryByText, queryByRole, getByTestId, getByLabelText, queryByTestId } = render(
				SwapProviderHeader,
				{ props, context }
			);

			expect(queryByRole('button', { name: en.swap.text.select })).toBeInTheDocument();

			activity.start({ requestId: 2, background: false });
			await tick();

			expect(queryByText(en.swap.text.swap_provider_website)).not.toBeInTheDocument();
			expect(queryByRole('button', { name: en.swap.text.select })).not.toBeInTheDocument();

			if (screen === 'md') {
				const header = getByTestId('collapsible-header');

				expect(header).toHaveAttribute('aria-disabled', 'true');
				expect(header).toHaveAttribute('tabindex', '-1');

				await fireEvent.click(header);
				await fireEvent.keyPress(header, { key: 'Enter' });

				expect(getByTestId('collapsible-content')).not.toHaveClass('expanded');
			} else {
				const trigger = getByLabelText(en.core.alt.open_details);

				expect(trigger).toBeDisabled();

				await fireEvent.click(trigger);

				expect(queryByTestId('bottom-sheet')).not.toBeInTheDocument();
			}
		}
	);

	it('mounts the single-line comparison header before an offer exists', () => {
		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.ICP_SWAP });
		const { getByText, getByTestId } = render(SwapProviderHeader, { props, context });

		const label = getByText(en.swap.text.smart_swap);
		const status = getByText(en.swap.text.comparing_providers);

		expect(status.parentElement).toBe(label.parentElement);
		expect(label.parentElement).toHaveClass('flex-nowrap', 'min-w-0', 'text-sm', 'text-tertiary');
		expect(status).toHaveClass('truncate');
		expect(label).toHaveClass('shrink-0');
		expect(getByTestId(SWAP_PROVIDER_ANIMATION).parentElement).toHaveClass(
			'max-w-[45%]',
			'min-w-0',
			'justify-end'
		);
		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.ICP_SWAP
		);
	});
});
