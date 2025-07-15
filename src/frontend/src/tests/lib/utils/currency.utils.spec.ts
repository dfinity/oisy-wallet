import { Currencies } from '$lib/enums/currencies';
import { Languages } from '$lib/types/languages';
import { getCurrencyName } from '$lib/utils/currency.utils';

describe('currency.utils', () => {
	describe('getCurrencyName', () => {
		const testCases: { currency: Currencies; language: Languages; expected: string }[] = [
			{ currency: Currencies.USD, language: Languages.ENGLISH, expected: 'US Dollar' },
			{ currency: Currencies.USD, language: Languages.GERMAN, expected: 'US-Dollar' },
			{ currency: Currencies.USD, language: Languages.ITALIAN, expected: 'dollaro statunitense' },
			{ currency: Currencies.USD, language: Languages.PORTUGUESE, expected: 'Dólar americano' },
			{ currency: Currencies.USD, language: Languages.CHINESE_SIMPLIFIED, expected: '美元' },

			{ currency: Currencies.EUR, language: Languages.ENGLISH, expected: 'Euro' },
			{ currency: Currencies.EUR, language: Languages.GERMAN, expected: 'Euro' },
			{ currency: Currencies.EUR, language: Languages.ITALIAN, expected: 'euro' },
			{ currency: Currencies.EUR, language: Languages.PORTUGUESE, expected: 'Euro' },
			{ currency: Currencies.EUR, language: Languages.CHINESE_SIMPLIFIED, expected: '欧元' },

			{ currency: Currencies.GBP, language: Languages.ENGLISH, expected: 'British Pound' },
			{ currency: Currencies.GBP, language: Languages.GERMAN, expected: 'Britisches Pfund' },
			{ currency: Currencies.GBP, language: Languages.ITALIAN, expected: 'sterlina britannica' },
			{ currency: Currencies.GBP, language: Languages.PORTUGUESE, expected: 'Libra esterlina' },
			{
				currency: Currencies.GBP,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '英镑'
			},

			{ currency: Currencies.CHF, language: Languages.ENGLISH, expected: 'Swiss Franc' },
			{ currency: Currencies.CHF, language: Languages.GERMAN, expected: 'Schweizer Franken' },
			{ currency: Currencies.CHF, language: Languages.ITALIAN, expected: 'franco svizzero' },
			{ currency: Currencies.CHF, language: Languages.PORTUGUESE, expected: 'Franco suíço' },
			{ currency: Currencies.CHF, language: Languages.CHINESE_SIMPLIFIED, expected: '瑞士法郎' },

			{ currency: Currencies.JPY, language: Languages.ENGLISH, expected: 'Japanese Yen' },
			{ currency: Currencies.JPY, language: Languages.GERMAN, expected: 'Japanischer Yen' },
			{ currency: Currencies.JPY, language: Languages.ITALIAN, expected: 'yen giapponese' },
			{ currency: Currencies.JPY, language: Languages.PORTUGUESE, expected: 'Iene japonês' },
			{ currency: Currencies.JPY, language: Languages.CHINESE_SIMPLIFIED, expected: '日元' }
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
					currency: 'xyz' as Currencies,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencyName({
					currency: 'xYz' as Currencies,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');

			expect(
				getCurrencyName({
					currency: 'XYZ' as Currencies,
					language: Languages.ENGLISH
				})
			).toBe('XYZ');
		});

		it('should return the default if language is not recognized', () => {
			expect(
				getCurrencyName({
					currency: Currencies.USD,
					language: 'invalid' as unknown as Languages
				})
			).toBe('US Dollar');
		});
	});
});
