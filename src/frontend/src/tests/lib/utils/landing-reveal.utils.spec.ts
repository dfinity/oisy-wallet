import { LANDING_REVEAL_DURATION } from '$lib/constants/landing.constants';
import { MOTION_REDUCED_FADE_DURATION } from '$lib/constants/transition.constants';
import { landingReveal } from '$lib/utils/landing-reveal.utils';

const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock('svelte/motion', () => ({
	prefersReducedMotion: {
		get current() {
			return motion.reduced;
		}
	}
}));

describe('landing-reveal.utils', () => {
	let callback: IntersectionObserverCallback | undefined;
	const observe = vi.fn();
	const disconnect = vi.fn();

	const entry = ({
		isIntersecting,
		bottom
	}: {
		isIntersecting: boolean;
		bottom: number;
	}): IntersectionObserverEntry =>
		({ isIntersecting, boundingClientRect: { bottom } }) as unknown as IntersectionObserverEntry;

	const trigger = (value: IntersectionObserverEntry) =>
		callback?.([value], {} as IntersectionObserver);

	beforeEach(() => {
		callback = undefined;
		motion.reduced = false;
		vi.clearAllMocks();

		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(cb: IntersectionObserverCallback) {
					callback = cb;
				}
				observe = observe;
				disconnect = disconnect;
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('hides the block until it scrolls into view', () => {
		const node = document.createElement('div');

		landingReveal()(node);

		expect(node.style.opacity).toBe('0');
		expect(observe).toHaveBeenCalledWith(node);
	});

	it('stays hidden while the block is still below the viewport', () => {
		const node = document.createElement('div');
		const animate = vi.spyOn(node, 'animate');

		landingReveal()(node);
		trigger(entry({ isIntersecting: false, bottom: 2000 }));

		expect(node.style.opacity).toBe('0');
		expect(animate).not.toHaveBeenCalled();
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('animates once with the given delay when the block enters the viewport', () => {
		const node = document.createElement('div');
		const animate = vi.spyOn(node, 'animate');

		landingReveal(100)(node);
		trigger(entry({ isIntersecting: true, bottom: 500 }));

		expect(node.style.opacity).toBe('');
		expect(disconnect).toHaveBeenCalledOnce();
		expect(animate).toHaveBeenCalledOnce();
		expect(animate.mock.calls[0]?.[1]).toMatchObject({
			duration: LANDING_REVEAL_DURATION,
			delay: 100,
			fill: 'backwards'
		});
	});

	it('shows a block the reader already scrolled past without animating it', () => {
		const node = document.createElement('div');
		const animate = vi.spyOn(node, 'animate');

		landingReveal()(node);
		trigger(entry({ isIntersecting: false, bottom: -10 }));

		expect(node.style.opacity).toBe('');
		expect(animate).not.toHaveBeenCalled();
	});

	it('only fades, without delay, when the reader prefers reduced motion', () => {
		motion.reduced = true;

		const node = document.createElement('div');
		const animate = vi.spyOn(node, 'animate');

		landingReveal(200)(node);
		trigger(entry({ isIntersecting: true, bottom: 500 }));

		expect(animate).toHaveBeenCalledWith(
			[{ opacity: 0 }, { opacity: 1 }],
			expect.objectContaining({ duration: MOTION_REDUCED_FADE_DURATION, delay: 0 })
		);
	});

	it('shows a block at once when something inside it takes focus', () => {
		const node = document.createElement('div');

		landingReveal()(node);
		node.dispatchEvent(new FocusEvent('focusin'));

		expect(node.style.opacity).toBe('');
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it('cancels a running entrance when something inside the block takes focus', () => {
		const node = document.createElement('div');
		const cancel = vi.fn();
		vi.spyOn(node, 'animate').mockReturnValue({ cancel } as unknown as Animation);

		landingReveal(200)(node);
		trigger(entry({ isIntersecting: true, bottom: 500 }));
		node.dispatchEvent(new FocusEvent('focusin'));

		expect(cancel).toHaveBeenCalledOnce();
		expect(node.style.opacity).toBe('');
	});

	it('leaves the block visible when IntersectionObserver is unavailable', () => {
		vi.stubGlobal('IntersectionObserver', undefined);

		const node = document.createElement('div');

		landingReveal()(node);

		expect(node.style.opacity).toBe('');
	});

	it('disconnects and restores visibility on cleanup', () => {
		const node = document.createElement('div');

		const cleanup = landingReveal()(node);
		cleanup?.();

		expect(disconnect).toHaveBeenCalledOnce();
		expect(node.style.opacity).toBe('');
	});
});
