import {
	MOTION_EASE_OUT_CSS,
	MOTION_REDUCED_FADE_DURATION
} from '$lib/constants/transition.constants';
import type { Attachment } from 'svelte/attachments';

// Same rhythm as the sign-in block's one-time entrance, so the page settles as one piece.
const LANDING_REVEAL_DURATION = 300;
export const LANDING_REVEAL_STAGGER = 100;

const prefersReducedMotion = (): boolean =>
	window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Reveals a landing block once, the first time it scrolls into view.
 *
 * Blocks already above the viewport (a reload or back navigation that restores the scroll
 * position) appear without animation, so nothing stays hidden behind the reader.
 */
export const landingReveal =
	(delay = 0): Attachment<HTMLElement> =>
	(node) => {
		if (typeof IntersectionObserver === 'undefined' || typeof node.animate !== 'function') {
			return;
		}

		node.style.opacity = '0';

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry === undefined) {
					return;
				}

				const passed = entry.boundingClientRect.bottom <= 0;

				if (!entry.isIntersecting && !passed) {
					return;
				}

				observer.disconnect();
				node.style.removeProperty('opacity');

				if (passed) {
					return;
				}

				const reduced = prefersReducedMotion();

				node.animate(
					reduced
						? [{ opacity: 0 }, { opacity: 1 }]
						: [
								{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(4px)' },
								{ opacity: 1, transform: 'none', filter: 'blur(0)' }
							],
					{
						duration: reduced ? MOTION_REDUCED_FADE_DURATION : LANDING_REVEAL_DURATION,
						delay: reduced ? 0 : delay,
						easing: MOTION_EASE_OUT_CSS,
						fill: 'backwards'
					}
				);
			},
			{ rootMargin: '0px 0px -10% 0px' }
		);

		observer.observe(node);

		return () => {
			observer.disconnect();
			node.style.removeProperty('opacity');
		};
	};

// The landing artwork layers in app.html; the plain page colour sits behind them.
const LANDING_BACKGROUND_IDS = ['app-background-landing-light', 'app-background-landing-dark'];

// Share of the first screen scrolled before the artwork starts and finishes fading.
const LANDING_BACKGROUND_FADE_START = 0.15;
const LANDING_BACKGROUND_FADE_END = 0.85;

export const landingBackgroundOpacity = ({
	scrollY,
	viewportHeight
}: {
	scrollY: number;
	viewportHeight: number;
}): number => {
	if (viewportHeight <= 0) {
		return 1;
	}

	const progress =
		(scrollY / viewportHeight - LANDING_BACKGROUND_FADE_START) /
		(LANDING_BACKGROUND_FADE_END - LANDING_BACKGROUND_FADE_START);

	return 1 - Math.min(1, Math.max(0, progress));
};

/**
 * Fades the landing's background artwork out over the first scroll, so the sections below the
 * hero sit on the plain page colour instead of the artwork's bright bands. Scroll-linked, not
 * timed, so it also runs with reduced motion. Removing it restores the artwork.
 */
export const landingBackgroundFade: Attachment<HTMLElement> = () => {
	const layers = LANDING_BACKGROUND_IDS.map((id) => document.getElementById(id)).filter(
		(layer): layer is HTMLElement => layer !== null
	);

	if (layers.length === 0) {
		return;
	}

	let frame: number | undefined;

	const update = () => {
		frame = undefined;
		const opacity = landingBackgroundOpacity({
			scrollY: window.scrollY,
			viewportHeight: window.innerHeight
		});
		layers.forEach((layer) => (layer.style.opacity = `${opacity}`));
	};

	const onScroll = () => {
		frame ??= requestAnimationFrame(update);
	};

	update();
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });

	return () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
		if (frame !== undefined) {
			cancelAnimationFrame(frame);
		}
		layers.forEach((layer) => layer.style.removeProperty('opacity'));
	};
};
