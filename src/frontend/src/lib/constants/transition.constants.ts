import { cubicIn, cubicOut, quintOut } from 'svelte/easing';
import type { SlideParams, TransitionConfig } from 'svelte/transition';

export const SLIDE_DURATION: Pick<SlideParams, 'duration'> = { duration: 250 };

// Duration of the Backdrop's fade-out. Shared so callers that must wait for the
// backdrop to clear (e.g. closing a popover before navigating) stay in sync with it.
export const BACKDROP_FADE_OUT_DURATION = 250;

export const SLIDE_EASING: Pick<SlideParams, 'easing' | 'axis'> = {
	easing: quintOut,
	axis: 'y'
};

export const SLIDE_PARAMS: SlideParams = { delay: 0, ...SLIDE_DURATION, ...SLIDE_EASING };

// Shared motion timings. Things arrive quickly and settle (ease-out), and leave faster than
// they came (ease-in), so an exit never holds up what the user does next. The transitions in
// `$lib/utils/transitions.utils` apply these when a call site passes no duration of its own.
export const MOTION_ENTER: Pick<TransitionConfig, 'duration' | 'easing'> = {
	duration: 200,
	easing: cubicOut
};

export const MOTION_EXIT: Pick<TransitionConfig, 'duration' | 'easing'> = {
	duration: 150,
	easing: cubicIn
};

// Small state changes: an icon swapping, a chip changing.
export const MOTION_SWAP_DURATION = 150;

// With the system's reduced-motion setting on, anything that would move, slide or scale
// fades in this long instead, so the change is still visible without movement.
export const MOTION_REDUCED_FADE_DURATION = 100;
