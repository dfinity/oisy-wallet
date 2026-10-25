import SwapProviderAnimation from '$lib/components/swap/SwapProviderAnimation.svelte';
import { SWAP_PROVIDER_ANIMATION } from '$lib/constants/test-ids.constants';
import { MOTION_EASE_OUT_CSS } from '$lib/constants/transition.constants';
import { SwapProvider } from '$lib/types/swap';
import { findSwapProvider } from '$lib/utils/swap.utils';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('svelte/motion', () => ({
	prefersReducedMotion: {
		get current() {
			return motion.reduced;
		}
	}
}));

describe('SwapProviderAnimation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		motion.reduced = false;
		vi.useRealTimers();
	});

	it('shows the selected provider immediately when no comparison is running', () => {
		const { getByTestId } = render(SwapProviderAnimation, {
			props: {
				providers: [],
				selectedProvider: SwapProvider.NEAR_INTENTS,
				loading: false
			}
		});

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.NEAR_INTENTS
		);
	});

	it.each([false, true])(
		'leaves the slot empty until the first participant, then fades it up (reduced: %s)',
		async (reduced) => {
			motion.reduced = reduced;
			const animate = vi.spyOn(Element.prototype, 'animate');
			const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
				props: { providers: [], loading: true }
			});
			const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);

			// No placeholder: only the screen-reader status is mounted.
			expect([...viewport.children].map((child) => child.className)).toEqual(['sr-only']);

			await rerender({ providers: [SwapProvider.VELORA] });
			await tick();
			await tick();
			const layer = viewport.querySelector('[data-provider-layer="current"]');
			const [fadeUp] = animate.mock.calls.filter(
				(_, index) => animate.mock.contexts[index] === layer
			);

			expect(layer).toHaveAttribute('data-provider', SwapProvider.VELORA);
			expect(fadeUp).toEqual(
				reduced
					? [[{ opacity: '0' }, { opacity: 1 }], expect.objectContaining({ duration: 100 })]
					: [
							[
								{ transform: 'translateY(4px)', opacity: '0' },
								{ transform: 'translateY(0) rotateX(0deg)', opacity: 1 }
							],
							expect.objectContaining({ duration: 200, easing: MOTION_EASE_OUT_CSS })
						]
			);

			unmount();
		}
	);

	it('lets a fade-up finish instead of restarting it when the round is revealed mid-fade', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.VELORA], loading: true }
		});
		await tick();
		await tick();
		const layer = getByTestId(SWAP_PROVIDER_ANIMATION).querySelector('[data-provider-layer]');

		expect(animate.mock.contexts).toContain(layer);

		animate.mockClear();
		await rerender({ selectedProvider: SwapProvider.VELORA, loading: false, confirmationId: 1 });
		await tick();
		await tick();

		expect(animate.mock.contexts).not.toContain(layer);

		unmount();
	});

	it('cycles only the participating providers while comparison is pending', async () => {
		vi.useFakeTimers();
		const { getByTestId, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI],
				loading: true
			}
		});

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.NEAR_INTENTS
		);

		await vi.advanceTimersByTimeAsync(650);

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.VELORA
		);

		await vi.advanceTimersByTimeAsync(650);

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.LIFI
		);

		unmount();
		vi.useRealTimers();
	});

	it('does not rotate candidates when reduced motion is requested', async () => {
		motion.reduced = true;
		vi.useFakeTimers();
		const { getByTestId, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA],
				loading: true
			}
		});

		await vi.advanceTimersByTimeAsync(650);

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.NEAR_INTENTS
		);

		unmount();
	});

	it('shows the incoming and outgoing providers together, then removes the outgoing layer', async () => {
		vi.useFakeTimers();
		const { getByTestId, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA],
				loading: true
			}
		});
		await vi.advanceTimersByTimeAsync(650);
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);
		expect(viewport.querySelector('[data-provider-layer="outgoing"]')).toHaveTextContent(
			'NEAR Intents'
		);

		await vi.advanceTimersByTimeAsync(151);

		expect(viewport.querySelector('[data-provider-layer="outgoing"]')).not.toBeInTheDocument();

		unmount();
	});

	it('preserves the reference spring phase across the layer and softness bridge within the shared turn budgets', async () => {
		vi.useFakeTimers();
		const supports = vi.fn(() => true);
		vi.stubGlobal('CSS', { supports });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		// Past the first provider's fade-up; only the turn is inspected.
		await tick();
		animate.mockClear();
		await vi.advanceTimersByTimeAsync(650);

		expect(animate).toHaveBeenCalledTimes(6);

		const [[, easing]] = animate.mock.calls;
		const curve = typeof easing === 'object' ? easing.easing : undefined;

		expect(curve).toMatch(/^linear\(/);
		expect(supports).toHaveBeenCalledWith('animation-timing-function', curve);

		const points = curve?.slice(7, -1).split(',').map(Number) ?? [];
		// Selected Text Loop: k=900, c=80, m=10. Normalize time at its first target crossing,
		// not at an arbitrary tail cutoff, and compare every serialized sample independently.
		const decay = 80 / (2 * 10);
		const omega = Math.sqrt(900 / 10 - decay ** 2);
		const crossing = (Math.PI - Math.atan(omega / decay)) / omega;

		expect(points.length).toBeGreaterThanOrEqual(25);
		expect(points.length).toBeLessThanOrEqual(40);
		expect(points[0]).toBe(0);
		expect(points.at(-1)).toBe(1);

		for (const [index, point] of points.entries()) {
			const time = (crossing * index) / (points.length - 1);
			const reference =
				1 -
				Math.exp(-decay * time) *
					(Math.cos(omega * time) + (decay / omega) * Math.sin(omega * time));

			expect(point).toBeCloseTo(reference, 5);
			expect(point).toBeGreaterThanOrEqual(points[Math.max(0, index - 1)]);
			expect(point).toBeLessThanOrEqual(1);
		}

		expect(points[(points.length - 1) / 2]).toBeCloseTo(0.416781, 5);

		for (const [index, [, options]] of animate.mock.calls.entries()) {
			expect(options).toMatchObject({ duration: index < 3 ? 150 : 200, easing: curve });
		}
		unmount();
	});

	it.each([
		{ name: 'unsupported linear easing', css: { supports: () => false } },
		{ name: 'missing CSS.supports', css: {} },
		{ name: 'missing CSS global', css: undefined }
	])('falls back to the existing ease-out for $name', async ({ css }) => {
		vi.useFakeTimers();
		vi.stubGlobal('CSS', css);
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		await tick();
		animate.mockClear();
		await vi.advanceTimersByTimeAsync(650);

		expect(animate).toHaveBeenCalledTimes(6);

		for (const [, options] of animate.mock.calls) {
			expect(options).toMatchObject({ easing: MOTION_EASE_OUT_CSS });
		}
		unmount();
	});

	it('recalls a passed winner immediately and gives it one soft confirmation', async () => {
		vi.useFakeTimers();
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI],
				loading: true
			}
		});
		await vi.advanceTimersByTimeAsync(1300);

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.LIFI
		);

		animate.mockClear();
		await rerender({
			loading: false,
			selectedProvider: SwapProvider.NEAR_INTENTS,
			confirmationId: 1
		});

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.NEAR_INTENTS
		);

		const confirmations = animate.mock.calls.filter(
			([frames]) =>
				Array.isArray(frames) &&
				frames.some(
					(frame) => typeof frame.transform === 'string' && frame.transform.includes('scale')
				)
		);

		expect(confirmations).toHaveLength(1);

		unmount();
	});

	it('updates a background selection without replaying provider motion', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [],
				loading: false,
				selectedProvider: SwapProvider.NEAR_INTENTS,
				animate: false
			}
		});
		animate.mockClear();
		await rerender({ selectedProvider: SwapProvider.VELORA });

		expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
			'data-provider',
			SwapProvider.VELORA
		);
		expect(animate).not.toHaveBeenCalled();

		unmount();
	});

	it('animates both mounted layers when a quote arrives after the previous transition settled', async () => {
		vi.useFakeTimers();
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		await vi.advanceTimersByTimeAsync(850);
		animate.mockClear();
		await rerender({
			loading: false,
			selectedProvider: SwapProvider.NEAR_INTENTS,
			confirmationId: 1
		});

		expect(
			animate.mock.contexts.some(
				(node) => node instanceof HTMLElement && node.dataset.providerLayer === 'outgoing'
			)
		).toBeTruthy();

		unmount();
	});

	it('renders the real provider logo rather than an unrelated fallback', () => {
		const { getByTestId } = render(SwapProviderAnimation, {
			props: { providers: [], loading: false, selectedProvider: SwapProvider.NEAR_INTENTS }
		});

		expect(getByTestId(SWAP_PROVIDER_ANIMATION).querySelector('img')).toHaveAttribute(
			'src',
			findSwapProvider(SwapProvider.NEAR_INTENTS)?.logo
		);
	});

	it('keeps every logo copy eager and subordinate to the provider reveal across cycling and winner recall', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI],
				loading: true
			}
		});
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		const expectParentOwnedLogos = () => {
			const layers = viewport.querySelectorAll('[data-provider-layer]');

			expect(layers.length).toBeGreaterThan(0);

			for (const layer of layers) {
				const images = layer.querySelectorAll('img');

				expect(images).toHaveLength(2);

				for (const image of images) {
					expect(image).toHaveAttribute('loading', 'eager');

					for (const className of ['opacity-10', 'transition-opacity', 'ease-in']) {
						expect(image.parentElement).not.toHaveClass(className);
					}
				}
			}
		};

		expectParentOwnedLogos();
		await vi.advanceTimersByTimeAsync(650);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		expectParentOwnedLogos();
		await vi.advanceTimersByTimeAsync(650);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.LIFI);

		expectParentOwnedLogos();
		await rerender({
			loading: false,
			selectedProvider: SwapProvider.NEAR_INTENTS,
			confirmationId: 1
		});

		// Ready selection is published without waiting for any image load event.
		expect(viewport).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

		expectParentOwnedLogos();
		for (const image of viewport.querySelectorAll('img')) {
			await fireEvent.load(image);
		}
		expectParentOwnedLogos();
		await vi.advanceTimersByTimeAsync(251);

		expect(viewport.querySelectorAll('[data-provider-layer]')).toHaveLength(1);

		expectParentOwnedLogos();
		unmount();
	});

	it('keeps an already visible winner readable instead of dimming it under reduced motion', async () => {
		motion.reduced = true;
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS], loading: true }
		});
		await tick();
		await tick();
		animate.mockClear();
		await rerender({
			selectedProvider: SwapProvider.NEAR_INTENTS,
			loading: false,
			confirmationId: 7
		});

		expect(animate).not.toHaveBeenCalled();

		unmount();
	});

	it('reuses the outgoing winner identity instead of remounting it hidden', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		await vi.advanceTimersByTimeAsync(650);
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		const outgoing = viewport.querySelector('[data-provider-layer="outgoing"]');

		expect(outgoing).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

		await rerender({
			selectedProvider: SwapProvider.NEAR_INTENTS,
			loading: false,
			confirmationId: 3
		});

		expect(viewport.querySelector('[data-provider-layer="current"]')).toBe(outgoing);

		unmount();
	});

	it('preserves both visible identities when a third provider wins and cleans them up', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI],
				loading: true
			}
		});
		await vi.advanceTimersByTimeAsync(650);
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		const before = [...viewport.querySelectorAll('[data-provider-layer]')].map((node) => ({
			node,
			provider: node.getAttribute('data-provider')
		}));

		expect(before).toHaveLength(2);

		await rerender({ selectedProvider: SwapProvider.LIFI, loading: false, confirmationId: 4 });
		for (const { node, provider } of before) {
			expect(node).toBeInTheDocument();
			expect(node).toHaveAttribute('data-provider', provider);
		}

		expect(viewport.querySelectorAll('[data-provider-layer]')).toHaveLength(3);

		await vi.advanceTimersByTimeAsync(251);

		expect(viewport.querySelectorAll('[data-provider-layer]')).toHaveLength(1);
		expect(viewport).toHaveAttribute('data-provider', SwapProvider.LIFI);

		unmount();
	});

	it('cancels the comparison timer and all running animations on destruction', async () => {
		vi.useFakeTimers();
		const interval = vi.spyOn(globalThis, 'setInterval');
		const clear = vi.spyOn(globalThis, 'clearInterval');
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		await vi.advanceTimersByTimeAsync(650);
		const running = animate.mock.results.flatMap((result) =>
			result.type === 'return' ? [result.value] : []
		);

		expect(running.length).toBeGreaterThan(0);

		unmount();

		expect(clear).toHaveBeenCalledWith(interval.mock.results.at(-1)?.value);

		for (const animation of running) {
			expect(animation.cancel).toHaveBeenCalled();
		}
	});

	it('keeps turning through the last round while a new round waits, and removes the result after an empty round', async () => {
		vi.useFakeTimers();
		const { getByTestId, queryByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		await vi.advanceTimersByTimeAsync(650);
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		// A new round has no participants yet: no placeholder, and no hold on one name either.
		await rerender({ providers: [] });
		await vi.advanceTimersByTimeAsync(650);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

		await vi.advanceTimersByTimeAsync(650);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		await rerender({ loading: false, selectedProvider: undefined });

		expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();

		unmount();
	});

	it('keeps one turn rhythm across rounds instead of restarting it on a keystroke', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: {
				providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA, SwapProvider.LIFI],
				loading: true
			}
		});
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		await vi.advanceTimersByTimeAsync(650);
		await vi.advanceTimersByTimeAsync(300);
		await rerender({ providers: [] });
		await vi.advanceTimersByTimeAsync(349);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		// The next turn comes 650 ms after the previous one, not 650 ms after the keystroke.
		await vi.advanceTimersByTimeAsync(1);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.LIFI);

		// The new round includes the shown provider: it stays, and the rhythm carries on.
		await vi.advanceTimersByTimeAsync(200);
		await rerender({ providers: [SwapProvider.LIFI, SwapProvider.NEAR_INTENTS] });

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.LIFI);

		await vi.advanceTimersByTimeAsync(450);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

		unmount();
	});

	it('moves on to the new round at the next turn when it leaves out the shown provider', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA], loading: true }
		});
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		await vi.advanceTimersByTimeAsync(650);
		await vi.advanceTimersByTimeAsync(200);
		await rerender({ providers: [SwapProvider.LIFI, SwapProvider.ONE_SEC] });

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		await vi.advanceTimersByTimeAsync(450);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.LIFI);

		unmount();
	});

	it('gives the first provider of a first round a full turn', async () => {
		vi.useFakeTimers();
		const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [], loading: true }
		});
		const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
		await vi.advanceTimersByTimeAsync(300);
		await rerender({ providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA] });
		await vi.advanceTimersByTimeAsync(649);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

		await vi.advanceTimersByTimeAsync(1);

		expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

		unmount();
	});

	it('does not replay confirmation for the same request or provider-only selection changes', async () => {
		vi.useFakeTimers();
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS], loading: true }
		});
		await rerender({
			loading: false,
			selectedProvider: SwapProvider.NEAR_INTENTS,
			confirmationId: 8
		});
		await vi.advanceTimersByTimeAsync(300);
		animate.mockClear();
		await rerender({ providers: [SwapProvider.NEAR_INTENTS, SwapProvider.VELORA] });

		expect(animate).not.toHaveBeenCalled();

		await rerender({ selectedProvider: SwapProvider.VELORA });

		expect(
			animate.mock.calls.filter(
				([frames]) =>
					Array.isArray(frames) &&
					frames.some(
						(frame) => typeof frame.transform === 'string' && frame.transform.includes('scale')
					)
			)
		).toHaveLength(0);

		unmount();
	});

	it('uses only the shared short opacity fade for a reduced-motion provider change', async () => {
		motion.reduced = true;
		const supports = vi.fn(() => true);
		vi.stubGlobal('CSS', { supports });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const { rerender, unmount } = render(SwapProviderAnimation, {
			props: { providers: [SwapProvider.NEAR_INTENTS], loading: true }
		});
		animate.mockClear();
		await rerender({ loading: false, selectedProvider: SwapProvider.VELORA, confirmationId: 9 });

		expect(animate).toHaveBeenCalledTimes(2);

		for (const [frames, options] of animate.mock.calls) {
			expect(typeof options === 'object' && options.duration).toBe(100);
			expect(options).toMatchObject({ easing: MOTION_EASE_OUT_CSS });
			expect(
				Array.isArray(frames) &&
					frames.every((frame) => !('transform' in frame) && !('filter' in frame))
			).toBeTruthy();
		}

		expect(supports).not.toHaveBeenCalled();

		unmount();
	});

	describe('provider pool', () => {
		const pool = {
			related: [SwapProvider.NEAR_INTENTS, SwapProvider.ONE_SEC],
			wider: [SwapProvider.ICP_SWAP]
		};

		it('turns through the asked providers, then the related pool, then the wider pool, then back', async () => {
			vi.useFakeTimers();
			const { getByTestId, unmount } = render(SwapProviderAnimation, {
				props: { providers: [SwapProvider.VELORA], pool, loading: true }
			});
			const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
			const seen = [viewport.getAttribute('data-provider')];
			for (let turn = 0; turn < 4; turn++) {
				await vi.advanceTimersByTimeAsync(650);
				seen.push(viewport.getAttribute('data-provider'));
			}

			expect(seen).toEqual([
				SwapProvider.VELORA,
				SwapProvider.NEAR_INTENTS,
				SwapProvider.ONE_SEC,
				SwapProvider.ICP_SWAP,
				SwapProvider.VELORA
			]);

			unmount();
		});

		it('never shows a pool provider first and still lands on the real winner', async () => {
			vi.useFakeTimers();
			const { getByTestId, rerender, unmount } = render(SwapProviderAnimation, {
				props: { providers: [], pool, loading: true }
			});
			const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
			await vi.advanceTimersByTimeAsync(1300);

			expect(viewport).not.toHaveAttribute('data-provider');

			await rerender({ providers: [SwapProvider.VELORA], pool, loading: true });

			expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

			await vi.advanceTimersByTimeAsync(650);

			expect(viewport).toHaveAttribute('data-provider', SwapProvider.NEAR_INTENTS);

			await rerender({
				providers: [SwapProvider.VELORA],
				pool,
				loading: false,
				selectedProvider: SwapProvider.VELORA
			});

			expect(viewport).toHaveAttribute('data-provider', SwapProvider.VELORA);

			unmount();
		});

		it('shows an asked provider once, not again from the pool', async () => {
			vi.useFakeTimers();
			const { getByTestId, unmount } = render(SwapProviderAnimation, {
				props: { providers: [SwapProvider.VELORA, SwapProvider.NEAR_INTENTS], pool, loading: true }
			});
			const viewport = getByTestId(SWAP_PROVIDER_ANIMATION);
			const seen = [viewport.getAttribute('data-provider')];
			for (let turn = 0; turn < 3; turn++) {
				await vi.advanceTimersByTimeAsync(650);
				seen.push(viewport.getAttribute('data-provider'));
			}

			expect(seen).toEqual([
				SwapProvider.VELORA,
				SwapProvider.NEAR_INTENTS,
				SwapProvider.ONE_SEC,
				SwapProvider.ICP_SWAP
			]);

			unmount();
		});

		it('shows no pool under reduced motion', async () => {
			motion.reduced = true;
			vi.useFakeTimers();
			const { getByTestId, unmount } = render(SwapProviderAnimation, {
				props: { providers: [SwapProvider.VELORA], pool, loading: true }
			});
			await vi.advanceTimersByTimeAsync(2000);

			expect(getByTestId(SWAP_PROVIDER_ANIMATION)).toHaveAttribute(
				'data-provider',
				SwapProvider.VELORA
			);

			unmount();
		});
	});
});
