import {
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_TWITTER_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';
import {
	mergeWithFallback,
	replaceOisyPlaceholders,
	replacePlaceholders
} from '$lib/utils/i18n.utils';
import { describe, expect } from 'vitest';

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
		} as unknown as I18n;
		const mockGermanTranslations = {
			key1: 'Key 1 Deutsch',
			key2: 'Key 2 Deutsch',
			nested: {
				key4: 'Key 4 Deutsch'
			}
		} as unknown as I18n;

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
		} as unknown as I18n;

		it('should merge missing translations from a reference language', () => {
			const result = mergeWithFallback(mockEnglishTranslations, mockGermanTranslations);

			expect(result).toEqual(expectedMergeResult);
		});

		it('should handle malformed translations by ignoring them', () => {
			const result = mergeWithFallback(mockEnglishTranslations, {
				...mockGermanTranslations,
				arrayNotAllowed: ['test'],
				emptyObj: {},
				nullKey: null
			} as unknown as I18n);

			expect(result).toEqual(expectedMergeResult);
		});
	});
});
