import type { Currencies } from '$lib/enums/currencies';
import type { Languages } from '$lib/types/languages';

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

export const getCurrencySymbol = ({
	currency,
	language
}: {
	currency: Currencies;
	language: Languages;
}): string | undefined =>
	(0)
		.toLocaleString(language, {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
			currencyDisplay: 'symbol'
		})
		.replace(/\d/g, '')
		.trim();

