import {
	currentCurrency,
	currentCurrencyDecimals,
	currentCurrencyExchangeRate,
	currentCurrencySymbol
} from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';

describe('currency.derived', () => {
	describe('currentCurrency', () => {
		it('should initialize with the default currency', () => {
			expect(get(currentCurrency)).toEqual(Currency.USD);
		});

		it('should return the current currency from the currency store', () => {
			expect(get(currentCurrency)).toEqual(Currency.USD);

			currencyStore.switchCurrency(Currency.CHF);

			expect(get(currentCurrency)).toEqual(Currency.CHF);

			currencyStore.switchCurrency(Currency.EUR);

			expect(get(currentCurrency)).toEqual(Currency.EUR);
		});
	});

	describe('currentCurrencyExchangeRate', () => {
		beforeEach(() => {
			currencyExchangeStore.setExchangeRateCurrency(Currency.USD);
		});

		it('should initialize with the default value', () => {
			expect(get(currentCurrencyExchangeRate)).toEqual(1);
		});

		it('should return the current value from the currency store', () => {
			expect(get(currentCurrencyExchangeRate)).toEqual(1);

			currencyExchangeStore.setExchangeRate(101);

			expect(get(currentCurrencyExchangeRate)).toEqual(101);

			currencyExchangeStore.setExchangeRate(1.5);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.5);
		});

		it('should return null if exchange rate is not set', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyExchangeStore.setExchangeRate(null);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});

		it('should return null when the language is switched', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyExchangeStore.setExchangeRateCurrency(Currency.CHF);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});

		it('should return null when the language is switched in the currencyStore', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyStore.switchCurrency(Currency.CHF);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});
	});

	describe('currentCurrencySymbol', () => {
		const testCases = [
			{ currency: Currency.USD, language: Languages.ENGLISH, expected: '$' },
			{ currency: Currency.EUR, language: Languages.ENGLISH, expected: '€' },
			{ currency: Currency.CHF, language: Languages.ENGLISH, expected: 'CHF' },
			{ currency: Currency.JPY, language: Languages.ENGLISH, expected: '¥' },
			{ currency: Currency.CNY, language: Languages.ENGLISH, expected: 'CN¥' },
			{ currency: Currency.USD, language: Languages.GERMAN, expected: '$' },
			{ currency: Currency.EUR, language: Languages.GERMAN, expected: '€' },
			{ currency: Currency.CHF, language: Languages.GERMAN, expected: 'CHF' },
			{ currency: Currency.JPY, language: Languages.GERMAN, expected: '¥' },
			{ currency: Currency.CNY, language: Languages.GERMAN, expected: 'CN¥' },
			{ currency: Currency.USD, language: Languages.CHINESE_SIMPLIFIED, expected: 'US$' },
			{ currency: Currency.EUR, language: Languages.CHINESE_SIMPLIFIED, expected: '€' },
			{ currency: Currency.CHF, language: Languages.CHINESE_SIMPLIFIED, expected: 'CHF' },
			{ currency: Currency.JPY, language: Languages.CHINESE_SIMPLIFIED, expected: 'JP¥' },
			{ currency: Currency.CNY, language: Languages.CHINESE_SIMPLIFIED, expected: '¥' }
		];

		beforeEach(() => {
			currencyStore.switchCurrency(Currency.USD);
			i18n.switchLang(Languages.ENGLISH);
		});

		it.each(testCases)(
			`should return $expected for $currency in $language`,
			({ currency, language, expected }) => {
				currencyStore.switchCurrency(currency);
				i18n.switchLang(language);

				expect(get(currentCurrencySymbol)).toEqual(expected);
			}
		);
	});

	describe('currentCurrencyDecimals', () => {
		const testCases = [
			{ currency: Currency.USD, language: Languages.ENGLISH, expected: 2 },
			{ currency: Currency.EUR, language: Languages.ENGLISH, expected: 2 },
			{ currency: Currency.JPY, language: Languages.ENGLISH, expected: 0 },
			{ currency: Currency.USD, language: Languages.ITALIAN, expected: 2 },
			{ currency: Currency.EUR, language: Languages.ITALIAN, expected: 2 },
			{ currency: Currency.JPY, language: Languages.ITALIAN, expected: 0 },
			{ currency: Currency.USD, language: Languages.CHINESE_SIMPLIFIED, expected: 2 },
			{ currency: Currency.EUR, language: Languages.CHINESE_SIMPLIFIED, expected: 2 },
			{ currency: Currency.JPY, language: Languages.CHINESE_SIMPLIFIED, expected: 0 }
		];

		beforeEach(() => {
			currencyStore.switchCurrency(Currency.USD);
			i18n.switchLang(Languages.ENGLISH);
		});

		it.each(testCases)(
			`should return $expected for $currency in $language`,
			({ currency, language, expected }) => {
				currencyStore.switchCurrency(currency);
				i18n.switchLang(language);

				expect(get(currentCurrencyDecimals)).toEqual(expected);
			}
		);
	});
});
