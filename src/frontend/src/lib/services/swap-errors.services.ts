import { i18n } from '$lib/stores/i18n.store';
import type { SwapErrorKey } from '$lib/types/swap';
import { get } from 'svelte/store';

export const getSwapErrorMessage = (key: keyof I18n['swap']['error']) => get(i18n).swap.error[key];

export const throwSwapError = (code: SwapErrorKey): never => {
	throw new SwapError(code);
};

export class SwapError extends Error {
	constructor(public readonly code: SwapErrorKey) {
		super(get(i18n).swap.error[code]);
		this.name = 'SwapError';
	}
}
