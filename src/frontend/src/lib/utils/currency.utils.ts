import type { Currencies } from '$lib/enums/currencies';
import type { Languages } from '$lib/enums/languages';

export const getCurrencyName = ({
	currency,
	language
}: {
	currency: Currencies;
	language: Languages;
}): string | undefined => {
	const currencyNames = new Intl.DisplayNames([language], { type: 'currency' });

	return currencyNames.of(currency.toUpperCase());
};
