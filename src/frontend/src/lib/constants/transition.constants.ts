import { quintOut } from 'svelte/easing';
import type { SlideParams } from 'svelte/transition';

export const SLIDE_DURATION: Pick<SlideParams, 'duration'> = { duration: 250 };

// Duration of the Backdrop's fade-out. Shared so callers that must wait for the
// backdrop to clear (e.g. closing a popover before navigating) stay in sync with it.
export const BACKDROP_FADE_OUT_DURATION = 250;

export const SLIDE_EASING: Pick<SlideParams, 'easing' | 'axis'> = {
	easing: quintOut,
	axis: 'y'
};

export const SLIDE_PARAMS: SlideParams = { delay: 0, ...SLIDE_DURATION, ...SLIDE_EASING };
