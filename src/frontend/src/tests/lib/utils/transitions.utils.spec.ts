import {
	MOTION_ENTER,
	MOTION_EXIT,
	MOTION_REDUCED_FADE_DURATION,
	SLIDE_PARAMS
} from '$lib/constants/transition.constants';
import { backdrop, blur, fade, fly, scale, slide } from '$lib/utils/transitions.utils';
import { linear } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock('svelte/motion', () => ({
	prefersReducedMotion: {
		get current() {
			return motion.reduced;
		}
	}
}));

describe('transitions.utils', () => {
	const node = document.createElement('div');

	// A `transition:` directive gets a function that Svelte calls with each run's direction.
	const run = ({
		result,
		direction
	}: {
		result: TransitionConfig | ((options?: { direction?: 'in' | 'out' }) => TransitionConfig);
		direction: 'in' | 'out';
	}): TransitionConfig => (typeof result === 'function' ? result({ direction }) : result);

	describe('backdrop', () => {
		it('interpolates dim and blur without fading the element opacity', () => {
			const node = document.createElement('div');
			node.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
			const transition = run({ result: backdrop(node, { blur: 4 }), direction: 'in' });

			expect(transition.css?.(0.5, 0.5)).toContain('50%');
			expect(transition.css?.(0.5, 0.5)).toContain('backdrop-filter: blur(2px)');
			expect(transition.css?.(0.5, 0.5)).not.toContain('opacity');
			expect(transition.css?.(1, 0)).toContain('100%');
		});

		it('keeps invisible backdrops unblurred', () => {
			const transition = run({ result: backdrop(node, { blur: 0 }), direction: 'in' });

			expect(transition.css?.(0.5, 0.5)).toContain('blur(0px)');
		});

		it('uses a capped fade under reduced motion', () => {
			motion.reduced = true;
			const transition = run({ result: backdrop(node, { duration: 150 }), direction: 'out' });

			expect(transition.duration).toBe(MOTION_REDUCED_FADE_DURATION);
			expect(transition.css?.(0.5, 0.5)).toContain('opacity');
			expect(transition.css?.(0.5, 0.5)).not.toContain('blur');
		});
	});

	beforeEach(() => {
		motion.reduced = false;
	});

	describe('shared timing when the call site passes none', () => {
		it.each([
			{ name: 'fade', fn: fade },
			{ name: 'fly', fn: fly },
			{ name: 'blur', fn: blur },
			{ name: 'scale', fn: scale }
		])('$name enters in 200 ms ease-out and leaves in 150 ms ease-in', ({ fn }) => {
			const enter = run({ result: fn(node, undefined, { direction: 'in' }), direction: 'in' });
			const exit = run({ result: fn(node, undefined, { direction: 'out' }), direction: 'out' });

			expect(enter).toMatchObject(MOTION_ENTER);
			expect(exit).toMatchObject(MOTION_EXIT);
		});

		it('gives a two-way transition the exit timing when it leaves', () => {
			const result = fade(node, undefined, { direction: 'both' });

			expect(typeof result).toBe('function');
			expect(run({ result, direction: 'in' })).toMatchObject(MOTION_ENTER);
			expect(run({ result, direction: 'out' })).toMatchObject(MOTION_EXIT);
		});

		it('keeps the styles it started from when it reverses mid-way', () => {
			// Svelte's fade reads the element's computed opacity when it is created.
			const computedStyle = vi.spyOn(globalThis, 'getComputedStyle');
			const result = fade(node, undefined, { direction: 'both' });

			computedStyle.mockReturnValue({ opacity: '1' } as CSSStyleDeclaration);
			const enter = run({ result, direction: 'in' });

			// Halfway through the entrance, the computed opacity is the animated one.
			computedStyle.mockReturnValue({ opacity: '0.5' } as CSSStyleDeclaration);
			const exit = run({ result, direction: 'out' });

			computedStyle.mockRestore();

			expect(exit.css?.(0.5, 0.5)).toBe('opacity: 0.5');
			expect(exit.css?.(0.5, 0.5)).toBe(enter.css?.(0.5, 0.5));
			expect(exit).toMatchObject(MOTION_EXIT);
		});

		it('stops moving if reduced motion turns on before it reverses', () => {
			const computedStyle = vi.spyOn(globalThis, 'getComputedStyle');
			const result = fly(node, { y: 100 }, { direction: 'both' });

			computedStyle.mockReturnValue({ opacity: '1', transform: 'none' } as CSSStyleDeclaration);
			const enter = run({ result, direction: 'in' });

			motion.reduced = true;
			computedStyle.mockReturnValue({ opacity: '0.5', transform: 'none' } as CSSStyleDeclaration);
			const exit = run({ result, direction: 'out' });

			computedStyle.mockRestore();

			expect(enter.css?.(0.5, 0.5)).toMatch(/transform/);
			expect(exit.duration).toBe(MOTION_REDUCED_FADE_DURATION);
			// The fade still ends at the opacity the transition started from, not the half-run one.
			expect(exit.css?.(0.5, 0.5)).toBe('opacity: 0.5');
		});

		it('keeps the easing the call site passes when it reverses', () => {
			const result = fade(node, { easing: linear }, { direction: 'both' });

			run({ result, direction: 'in' });

			expect(run({ result, direction: 'out' })).toMatchObject({
				duration: MOTION_EXIT.duration,
				easing: linear
			});
		});

		it('keeps a height slide at the slide timing both ways', () => {
			const enter = run({ result: slide(node, undefined, { direction: 'in' }), direction: 'in' });
			const exit = run({ result: slide(node, undefined, { direction: 'out' }), direction: 'out' });

			expect(enter).toMatchObject({
				duration: SLIDE_PARAMS.duration,
				easing: SLIDE_PARAMS.easing
			});
			expect(exit).toMatchObject({ duration: SLIDE_PARAMS.duration, easing: SLIDE_PARAMS.easing });
		});

		it('does not let a `duration: undefined` blank the shared timing', () => {
			const config = run({
				result: fade(node, { duration: undefined }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.duration).toBe(MOTION_ENTER.duration);
		});

		it('keeps the other params the call site passes', () => {
			const config = run({
				result: fade(node, { delay: 40, easing: linear }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config).toMatchObject({ delay: 40, duration: MOTION_ENTER.duration, easing: linear });
		});
	});

	describe('a timing the call site passes', () => {
		it('is left exactly as Svelte would run it', () => {
			const config = run({
				result: fade(node, { duration: 25 }, { direction: 'out' }),
				direction: 'out'
			});

			expect(config.duration).toBe(25);
			// Svelte's own default (linear), not the shared exit easing.
			expect(config.easing?.(0.5)).toBe(0.5);
		});

		it('keeps an instant close instant', () => {
			const config = run({
				result: fly(node, { y: 320, duration: 0 }, { direction: 'out' }),
				direction: 'out'
			});

			expect(config.duration).toBe(0);
		});
	});

	describe('nothing grows from nothing', () => {
		it('starts a scale at 96 %', () => {
			const config = run({ result: scale(node, undefined, { direction: 'in' }), direction: 'in' });

			expect(config.css?.(0, 1)).toContain('scale(0.96)');
		});

		it('keeps a start the call site passes', () => {
			const config = run({
				result: scale(node, { start: 0.5 }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.css?.(0, 1)).toContain('scale(0.5)');
		});

		it('does not let a `start: undefined` grow it from zero', () => {
			const config = run({
				result: scale(node, { start: undefined, duration: 200 }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.css?.(0, 1)).toContain('scale(0.96)');
		});
	});

	describe('with reduced motion on', () => {
		beforeEach(() => {
			motion.reduced = true;
		});

		it.each([
			{ name: 'fly', fn: fly, params: { y: 100 } },
			{ name: 'scale', fn: scale, params: {} },
			{ name: 'blur', fn: blur, params: {} }
		])('turns $name into a short fade with no movement', ({ fn, params }) => {
			const config = run({ result: fn(node, params, { direction: 'in' }), direction: 'in' });

			expect(config.duration).toBe(MOTION_REDUCED_FADE_DURATION);
			expect(config.css?.(0.5, 0.5)).toMatch(/^opacity: /);
			expect(config.css?.(0.5, 0.5)).not.toMatch(/transform|scale|translate/);
		});

		it('shortens a fade to 100 ms', () => {
			const config = run({
				result: fade(node, { duration: 400 }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.duration).toBe(MOTION_REDUCED_FADE_DURATION);
		});

		it('keeps a fade the call site made shorter', () => {
			const config = run({
				result: fade(node, { duration: 25 }, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.duration).toBe(25);
		});

		it('changes height at once', () => {
			const config = run({
				result: slide(node, SLIDE_PARAMS, { direction: 'in' }),
				direction: 'in'
			});

			expect(config.duration).toBe(0);
			expect(config.css).toBeUndefined();
		});
	});
});
