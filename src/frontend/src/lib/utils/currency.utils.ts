import type { Currency } from '$lib/enums/currency';
import type { Languages } from '$lib/enums/languages';

export const getCurrencyName = ({
	currency,
	language
}: {
	currency: Currency;
	language: Languages;
}): string | undefined => {
	const currencyNames = new Intl.DisplayNames([language], { type: 'currency' });

	return currencyNames.of(currency.toUpperCase());
};

export const getCurrencySymbol = ({
	currency,
	language
}: {
	currency: Currency;
	language: Languages;
}): string | undefined =>
	new Intl.NumberFormat(language, { style: 'currency', currency })
		.formatToParts(0)
		.find((p) => p.type === 'currency')?.value;

export const getCurrencyDecimalDigits = ({
	currency,
	language
}: {
	currency: Currency;
	language: Languages;
}): number =>
	new Intl.NumberFormat(language, { style: 'currency', currency }).resolvedOptions()
		.maximumFractionDigits;
