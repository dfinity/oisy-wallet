import { LANDING_SECTION_IDS } from '$lib/constants/landing.constants';
import type { Attachment } from 'svelte/attachments';

export interface LandingSectionLink {
	href: `#landing-${string}`;
	label: string;
}

/** The landing sections the header row and the phone menu jump to, in page order. */
export const landingSectionLinks = (i18n: I18n): LandingSectionLink[] => [
	{ href: `#${LANDING_SECTION_IDS.hold}`, label: i18n.navigation.text.tokens },
	{ href: `#${LANDING_SECTION_IDS.security}`, label: i18n.auth.landing.security_eyebrow },
	{ href: `#${LANDING_SECTION_IDS.swap}`, label: i18n.swap.text.swap },
	{ href: `#${LANDING_SECTION_IDS.borrow}`, label: i18n.auth.landing.borrow_eyebrow }
];

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
