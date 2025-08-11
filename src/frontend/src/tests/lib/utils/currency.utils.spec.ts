import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import {
	getCurrencyDecimalDigits,
	getCurrencyName,
	getCurrencySymbol
} from '$lib/utils/currency.utils';

describe('currency.utils', () => {
	describe('getCurrencyName', () => {
		const testCases: { currency: Currency; language: Languages; expected: string }[] = [
			{ currency: Currency.USD, language: Languages.ENGLISH, expected: 'US Dollar' },
			{ currency: Currency.USD, language: Languages.GERMAN, expected: 'US-Dollar' },
			{ currency: Currency.USD, language: Languages.ITALIAN, expected: 'dollaro statunitense' },
			{ currency: Currency.USD, language: Languages.PORTUGUESE, expected: 'Dólar americano' },
			{ currency: Currency.USD, language: Languages.CHINESE_SIMPLIFIED, expected: '美元' },

			{ currency: Currency.EUR, language: Languages.ENGLISH, expected: 'Euro' },
			{ currency: Currency.EUR, language: Languages.GERMAN, expected: 'Euro' },
			{ currency: Currency.EUR, language: Languages.ITALIAN, expected: 'euro' },
			{ currency: Currency.EUR, language: Languages.PORTUGUESE, expected: 'Euro' },
			{ currency: Currency.EUR, language: Languages.CHINESE_SIMPLIFIED, expected: '欧元' },

			{ currency: Currency.GBP, language: Languages.ENGLISH, expected: 'British Pound' },
			{ currency: Currency.GBP, language: Languages.GERMAN, expected: 'Britisches Pfund' },
			{ currency: Currency.GBP, language: Languages.ITALIAN, expected: 'sterlina britannica' },
			{ currency: Currency.GBP, language: Languages.PORTUGUESE, expected: 'Libra esterlina' },
			{
				currency: Currency.GBP,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '英镑'
			},

			{ currency: Currency.CHF, language: Languages.ENGLISH, expected: 'Swiss Franc' },
			{ currency: Currency.CHF, language: Languages.GERMAN, expected: 'Schweizer Franken' },
			{ currency: Currency.CHF, language: Languages.ITALIAN, expected: 'franco svizzero' },
			{ currency: Currency.CHF, language: Languages.PORTUGUESE, expected: 'Franco suíço' },
			{ currency: Currency.CHF, language: Languages.CHINESE_SIMPLIFIED, expected: '瑞士法郎' },

			{ currency: Currency.JPY, language: Languages.ENGLISH, expected: 'Japanese Yen' },
			{ currency: Currency.JPY, language: Languages.GERMAN, expected: 'Japanischer Yen' },
			{ currency: Currency.JPY, language: Languages.ITALIAN, expected: 'yen giapponese' },
			{ currency: Currency.JPY, language: Languages.PORTUGUESE, expected: 'Iene japonês' },
			{ currency: Currency.JPY, language: Languages.CHINESE_SIMPLIFIED, expected: '日元' }
		];

		it.each(testCases)(
			'should return $expected for currency $currency in language $language',
			({ currency, language, expected }) => {
				const result = getCurrencyName({ currency, language });

				expect(result).toBe(expected);
			}
		);

		it('should return the uppercase input if currency is not recognized', () => {
			expect(
				getCurrencyName({
					currency: 'xyz' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencyName({
					currency: 'xYz' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencyName({
					currency: 'XYZ' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');
		});

		it('should return the default if language is not recognized', () => {
			expect(
				getCurrencyName({
					currency: Currency.USD,
					language: 'invalid' as unknown as Languages
				})
			).toBe('US Dollar');

			expect(
				getCurrencyName({
					currency: Currency.CHF,
					language: 'invalid' as unknown as Languages
				})
			).toBe('Swiss Franc');
		});
	});

	describe('getCurrencySymbol', () => {
		const testCases: { currency: Currency; language: Languages; expected: string }[] = [
			{ currency: Currency.USD, language: Languages.ENGLISH, expected: '$' },
			{ currency: Currency.USD, language: Languages.GERMAN, expected: '$' },
			{ currency: Currency.USD, language: Languages.ITALIAN, expected: 'USD' },
			{ currency: Currency.USD, language: Languages.PORTUGUESE, expected: 'US$' },
			{ currency: Currency.USD, language: Languages.CHINESE_SIMPLIFIED, expected: 'US$' },

			{ currency: Currency.EUR, language: Languages.ENGLISH, expected: '€' },
			{ currency: Currency.EUR, language: Languages.GERMAN, expected: '€' },
			{ currency: Currency.EUR, language: Languages.ITALIAN, expected: '€' },
			{ currency: Currency.EUR, language: Languages.PORTUGUESE, expected: '€' },
			{ currency: Currency.EUR, language: Languages.CHINESE_SIMPLIFIED, expected: '€' },

			{ currency: Currency.GBP, language: Languages.ENGLISH, expected: '£' },
			{ currency: Currency.GBP, language: Languages.GERMAN, expected: '£' },
			{ currency: Currency.GBP, language: Languages.ITALIAN, expected: '£' },
			{ currency: Currency.GBP, language: Languages.PORTUGUESE, expected: '£' },
			{ currency: Currency.GBP, language: Languages.CHINESE_SIMPLIFIED, expected: '£' },

			{ currency: Currency.CHF, language: Languages.ENGLISH, expected: 'CHF' },
			{ currency: Currency.CHF, language: Languages.GERMAN, expected: 'CHF' },
			{ currency: Currency.CHF, language: Languages.ITALIAN, expected: 'CHF' },
			{ currency: Currency.CHF, language: Languages.PORTUGUESE, expected: 'CHF' },
			{ currency: Currency.CHF, language: Languages.CHINESE_SIMPLIFIED, expected: 'CHF' },

			{ currency: Currency.JPY, language: Languages.ENGLISH, expected: '¥' },
			{ currency: Currency.JPY, language: Languages.GERMAN, expected: '¥' },
			{ currency: Currency.JPY, language: Languages.ITALIAN, expected: 'JPY' },
			{ currency: Currency.JPY, language: Languages.PORTUGUESE, expected: 'JP¥' },
			{ currency: Currency.JPY, language: Languages.CHINESE_SIMPLIFIED, expected: 'JP¥' },

			{ currency: Currency.CNY, language: Languages.ENGLISH, expected: 'CN¥' },
			{ currency: Currency.CNY, language: Languages.GERMAN, expected: 'CN¥' },
			{ currency: Currency.CNY, language: Languages.ITALIAN, expected: 'CN¥' },
			{ currency: Currency.CNY, language: Languages.PORTUGUESE, expected: 'CN¥' },
			{ currency: Currency.CNY, language: Languages.CHINESE_SIMPLIFIED, expected: '¥' }
		];

		it.each(testCases)(
			'should return $expected for currency $currency in language $language',
			({ currency, language, expected }) => {
				const result = getCurrencySymbol({ currency, language });

				expect(result).toBe(expected);
			}
		);

		it('should return the uppercase input if currency is not recognized', () => {
			expect(
				getCurrencySymbol({
					currency: 'xyz' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencySymbol({
					currency: 'xYz' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencySymbol({
					currency: 'XYZ' as Currency,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');
		});

		it('should return the default if language is not recognized', () => {
			expect(
				getCurrencySymbol({
					currency: Currency.USD,
					language: 'invalid' as unknown as Languages
				})
			).toBe('$');

			expect(
				getCurrencySymbol({
					currency: Currency.CHF,
					language: 'invalid' as unknown as Languages
				})
			).toBe('CHF');
		});
	});

	describe('getCurrencyDecimalDigits', () => {
		const testCases: { currency: Currency; language: Languages; expected: number }[] = [
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

		it.each(testCases)(
			'should return $expected for currency $currency in language $language',
			({ currency, language, expected }) => {
				const result = getCurrencyDecimalDigits({ currency, language });

				expect(result).toBe(expected);
			}
		);
	});
});
