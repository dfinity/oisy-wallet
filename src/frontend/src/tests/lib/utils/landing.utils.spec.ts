import { LANDING_SECTION_IDS } from '$lib/constants/landing.constants';
import { i18n } from '$lib/stores/i18n.store';
import {
	landingBackgroundFade,
	landingBackgroundOpacity,
	landingSectionLinks
} from '$lib/utils/landing.utils';
import { get } from 'svelte/store';

describe('landing.utils', () => {
	describe('landingSectionLinks', () => {
		it('links the four landing sections in page order', () => {
			const $i18n = get(i18n);

			expect(landingSectionLinks($i18n)).toEqual([
				{ href: `#${LANDING_SECTION_IDS.hold}`, label: $i18n.navigation.text.tokens },
				{ href: `#${LANDING_SECTION_IDS.security}`, label: $i18n.auth.landing.security_eyebrow },
				{ href: `#${LANDING_SECTION_IDS.swap}`, label: $i18n.swap.text.swap },
				{ href: `#${LANDING_SECTION_IDS.borrow}`, label: $i18n.auth.landing.borrow_eyebrow }
			]);
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
});
