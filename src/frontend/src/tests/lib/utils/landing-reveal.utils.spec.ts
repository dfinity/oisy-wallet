import { MOTION_REDUCED_FADE_DURATION } from '$lib/constants/transition.constants';
import {
	landingBackgroundFade,
	landingBackgroundOpacity,
	landingReveal
} from '$lib/utils/landing-reveal.utils';

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
			duration: 300,
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
		vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);

		const node = document.createElement('div');
		const animate = vi.spyOn(node, 'animate');

		landingReveal(200)(node);
		trigger(entry({ isIntersecting: true, bottom: 500 }));

		expect(animate).toHaveBeenCalledWith(
			[{ opacity: 0 }, { opacity: 1 }],
			expect.objectContaining({ duration: MOTION_REDUCED_FADE_DURATION, delay: 0 })
		);
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

describe('landingBackgroundOpacity', () => {
	it('keeps the artwork at the top of the page', () => {
		expect(landingBackgroundOpacity({ scrollY: 0, viewportHeight: 1000 })).toBe(1);
		expect(landingBackgroundOpacity({ scrollY: 150, viewportHeight: 1000 })).toBe(1);
	});

	it('fades the artwork across the first screen', () => {
		expect(landingBackgroundOpacity({ scrollY: 500, viewportHeight: 1000 })).toBeCloseTo(0.5);
	});

	it('hides the artwork once the first screen is scrolled past', () => {
		expect(landingBackgroundOpacity({ scrollY: 850, viewportHeight: 1000 })).toBe(0);
		expect(landingBackgroundOpacity({ scrollY: 4000, viewportHeight: 1000 })).toBe(0);
	});

	it('keeps the artwork when the viewport has no height', () => {
		expect(landingBackgroundOpacity({ scrollY: 500, viewportHeight: 0 })).toBe(1);
	});
});

describe('landingBackgroundFade', () => {
	let layers: HTMLElement[];

	beforeEach(() => {
		layers = ['app-background-landing-light', 'app-background-landing-dark'].map((id) => {
			const layer = document.createElement('img');
			layer.id = id;
			document.body.append(layer);
			return layer;
		});
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			callback(0);
			return 1;
		});
		vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000);
	});

	afterEach(() => {
		layers.forEach((layer) => layer.remove());
		window.scrollY = 0;
	});

	it('sets the artwork opacity from the scroll position and restores it on cleanup', () => {
		window.scrollY = 0;
		const cleanup = landingBackgroundFade(document.createElement('div'));

		layers.forEach((layer) => expect(layer.style.opacity).toBe('1'));

		window.scrollY = 2000;
		window.dispatchEvent(new Event('scroll'));

		layers.forEach((layer) => expect(layer.style.opacity).toBe('0'));

		cleanup?.();

		layers.forEach((layer) => expect(layer.style.opacity).toBe(''));
	});

	it('does nothing without the artwork layers', () => {
		layers.forEach((layer) => layer.remove());

		expect(landingBackgroundFade(document.createElement('div'))).toBeUndefined();
	});
});
