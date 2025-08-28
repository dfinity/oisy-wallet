import {
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_TWITTER_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';
import { Languages } from '$lib/enums/languages';
import {
	getDefaultLang,
	mergeWithFallback,
	replaceOisyPlaceholders,
	replacePlaceholders
} from '$lib/utils/i18n.utils';

describe('i18n-utils', () => {
	describe('replacePlaceholders', () => {
		it('should replace single placeholder', () => {
			expect(replacePlaceholders('Hello this!', { this: 'World' })).toBe('Hello World!');
		});

		it('should replace multiple occurances', () => {
			expect(
				replacePlaceholders('Bow wow wow yippie yo yippie yay... Where my dogs at?', {
					wow: 'quack',
					dogs: 'ducks'
				})
			).toBe('Bow quack quack yippie yo yippie yay... Where my ducks at?');
		});

		it('should return the original text if nothing to replace', () => {
			expect(
				replacePlaceholders('Lorem Ipsum!', {
					$1: 'World',
					Why: 'Hello',
					'?': '!'
				})
			).toBe('Lorem Ipsum!');
		});

		it('should escape regexp special characters in placeholder values', () => {
			expect(
				replacePlaceholders('^.*$1$2?[%]^|/{1}', {
					'^.*': 'The ',
					$1: 'quick ',
					$2: 'brown ',
					'?': 'fox ',
					'[%]': 'jumps ',
					'^': 'over ',
					'|': 'the ',
					'/': 'lazy ',
					'{1}': 'dog'
				})
			).toBe('The quick brown fox jumps over the lazy dog');
		});

		it('should replace Oisy placeholders', () => {
			expect(
				replaceOisyPlaceholders(
					'Lorem Ipsum! $oisy_name $oisy_oneliner $oisy_description $oisy_twitter_url'
				)
			).toBe(`Lorem Ipsum! ${OISY_NAME} ${OISY_ONELINER} ${OISY_DESCRIPTION} ${OISY_TWITTER_URL}`);

			expect(replaceOisyPlaceholders('Url: $oisy_url')).toBe(`Url: ${OISY_URL}`);

			expect(replaceOisyPlaceholders('Url: $oisy_repo_url')).toBe(`Url: ${OISY_REPO_URL}`);
		});
	});

	describe('mergeWithFallback', () => {
		interface MockI18n {
			[key: string]: string | MockI18n;
		}

		const mockEnglishTranslations = {
			key1: 'Key 1 English',
			key2: 'Key 2 English',
			key3: 'Key 3 English',
			nested: {
				key4: 'Key 4 English',
				deeplyNested: {
					key5: 'Key 5 English'
				}
			}
		} as MockI18n;
		const mockGermanTranslations = {
			key1: 'Key 1 Deutsch',
			key2: 'Key 2 Deutsch',
			nested: {
				key4: 'Key 4 Deutsch'
			}
		} as MockI18n;

		const expectedMergeResult = {
			key1: 'Key 1 Deutsch',
			key2: 'Key 2 Deutsch',
			key3: 'Key 3 English',
			nested: {
				key4: 'Key 4 Deutsch',
				deeplyNested: {
					key5: 'Key 5 English'
				}
			}
		} as MockI18n;

		it('should merge missing translations from a reference language', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: mockGermanTranslations as unknown as I18n
			});

			expect(result).toEqual(expectedMergeResult);
		});

		it('should handle malformed translations by ignoring them', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: {
					...mockGermanTranslations,
					arrayNotAllowed: ['test'],
					emptyObj: {},
					nullKey: null
				} as unknown as I18n
			});

			expect(result).toEqual(expectedMergeResult);
		});

		it('should return the full reference language when target is empty', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: {} as I18n
			});

			expect(result).toEqual(mockEnglishTranslations);
		});

		it('should copy entire nested object from reference if missing in target', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: {
					key1: 'Key 1 Deutsch',
					key2: 'Key 2 Deutsch',
					key3: 'Key 3 Deutsch'
				} as unknown as I18n
			});

			expect((result as unknown as MockI18n).nested).toEqual(mockEnglishTranslations.nested);
		});

		it('should prefer reference value if target type mismatches (e.g., object vs string)', () => {
			const brokenTarget = {
				key1: 'Key 1 Deutsch',
				nested: 'not-an-object'
			} as unknown as I18n;

			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: brokenTarget as unknown as I18n
			});

			expect((result as unknown as MockI18n).nested).toEqual(mockEnglishTranslations.nested);
		});

		it('should return reference when target is null', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: null as unknown as I18n
			});

			expect(result).toEqual(mockEnglishTranslations);
		});

		it('should consider empty strings as missing and fall back to reference', () => {
			const result = mergeWithFallback({
				refLang: mockEnglishTranslations as unknown as I18n,
				targetLang: { ...mockGermanTranslations, key3: '' } as unknown as I18n
			});

			expect(result).toEqual(expectedMergeResult);
		});
	});

	describe('getDefaultLang', () => {
		const originalLanguage = navigator.language;

		afterEach(() => {
			// Restore original language after each test
			Object.defineProperty(global.navigator, 'language', {
				configurable: true,
				value: originalLanguage
			});
		});

		const mockNavigatorLanguage = (lang: string) => {
			Object.defineProperty(global.navigator, 'language', {
				configurable: true,
				value: lang
			});
		};

		it('returns ENGLISH when language is unsupported', () => {
			mockNavigatorLanguage('la-VA');

			expect(getDefaultLang()).toBe(Languages.ENGLISH);
		});

		it('returns GERMAN when browser language is de-DE', () => {
			mockNavigatorLanguage('de-DE');

			expect(getDefaultLang()).toBe(Languages.GERMAN);
		});

		it('returns ENGLISH when browser language is en-US', () => {
			mockNavigatorLanguage('en-US');

			expect(getDefaultLang()).toBe(Languages.ENGLISH);
		});

		it('only returns supported Languages enum values', () => {
			const supported = Object.values(Languages);
			const testLocales = ['es-ES', 'zh-CN', 'pt-BR'];

			for (const lang of testLocales) {
				mockNavigatorLanguage(lang);
				const result = getDefaultLang();

				expect(supported).toContain(result);
			}
		});
	});
});
