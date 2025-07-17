import type { Currencies } from '$lib/enums/currencies';
import { currencyStore } from '$lib/stores/currency.store';
import { derived, type Readable } from 'svelte/store';

export const currentCurrency: Readable<Currencies> = derived(
	[currencyStore],
	([{ currency }]) => currency
);
