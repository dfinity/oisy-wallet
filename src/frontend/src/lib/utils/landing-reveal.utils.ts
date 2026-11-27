import { LANDING_REVEAL_DURATION } from '$lib/constants/landing.constants';
import {
	MOTION_EASE_OUT_CSS,
	MOTION_REDUCED_FADE_DURATION
} from '$lib/constants/transition.constants';
import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from 'svelte/motion';

/**
 * Reveals a landing block once, the first time it scrolls into view.
 *
 * Blocks already above the viewport (a reload or back navigation that restores the scroll
 * position) appear without animation, so nothing stays hidden behind the reader. Keyboard focus
 * shows the block at once: the observer ignores the bottom 10% of the viewport, where a browser
 * that scrolls only as far as needed can leave a focused link.
 */
export const landingReveal =
	(delay = 0): Attachment<HTMLElement> =>
	(node) => {
		if (typeof IntersectionObserver === 'undefined' || typeof node.animate !== 'function') {
			return;
		}

		node.style.opacity = '0';

		let animation: Animation | undefined;

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

				const reduced = prefersReducedMotion.current;

				animation = node.animate(
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

		const showOnFocus = () => {
			observer.disconnect();
			// Drops a delayed or running entrance, so the block shows at its final state.
			animation?.cancel();
			node.style.removeProperty('opacity');
		};

		node.addEventListener('focusin', showOnFocus, { once: true });
		observer.observe(node);

		return () => {
			observer.disconnect();
			node.removeEventListener('focusin', showOnFocus);
			node.style.removeProperty('opacity');
		};
	};
