import { exchangeStore } from '$lib/stores/exchange.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const exchangeInitialized: Readable<boolean> = derived([exchangeStore], ([$exchangeStore]) =>
	nonNullish($exchangeStore)
);
