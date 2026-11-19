import { currentCurrency } from '$lib/derived/currency.derived';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { formatCurrency } from '$lib/utils/format.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The selected pair's NEAR Intents fiat floor, formatted in the user's display currency.
 *
 * `undefined` when there is no floor, and also while the exchange rate still belongs to the
 * previously selected currency: a figure with no currency on it is never shown. This is the one
 * definition of whether the floor can be stated, shared by the notice that states it and by the
 * forms that step aside for it, so the two cannot disagree.
 */
export const nearIntentsSwapLimitFormatted: Readable<string | undefined> = derived(
	[nearIntentsSwapLimitStore, currentCurrency, currencyExchangeStore, currentLanguage],
	([$limit, $currency, $exchangeRate, $language]) =>
		isNullish($limit)
			? undefined
			: formatCurrency({
					value: $limit,
					currency: $currency,
					exchangeRate: $exchangeRate,
					language: $language
				})
);
