import { quintOut } from 'svelte/easing';
import type { SlideParams } from 'svelte/transition';

export const SLIDE_DURATION: Pick<SlideParams, 'duration'> = { duration: 250 };

export const SLIDE_EASING: Pick<SlideParams, 'easing' | 'axis'> = {
	easing: quintOut,
	axis: 'y'
};

export const SLIDE_PARAMS: SlideParams = { delay: 0, ...SLIDE_DURATION, ...SLIDE_EASING };
