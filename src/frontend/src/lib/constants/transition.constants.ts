import { quintOut } from 'svelte/easing';
import type { SlideParams } from 'svelte/transition';

export const SLIDE_DURATION = { duration: 250 };

export const SLIDE_QUINT_OUT: Pick<SlideParams, 'easing' | 'axis'> = {
	easing: quintOut,
	axis: 'y'
};

export const SLIDE_PARAMS: SlideParams = { delay: 0, ...SLIDE_DURATION, ...SLIDE_QUINT_OUT };
