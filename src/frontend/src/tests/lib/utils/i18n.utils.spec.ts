import {
	OISY_ALPHA_WARNING_URL,
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_TWITTER_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

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
					'Lorem Ipsum! $oisy_name $oisy_oneliner $oisy_description $oisy_alpha_warning_url $oisy_twitter_url'
				)
			).toBe(
				`Lorem Ipsum! ${OISY_NAME} ${OISY_ONELINER} ${OISY_DESCRIPTION} ${OISY_ALPHA_WARNING_URL} ${OISY_TWITTER_URL}`
			);

			expect(replaceOisyPlaceholders('Url: $oisy_url')).toBe(`Url: ${OISY_URL}`);

			expect(replaceOisyPlaceholders('Url: $oisy_repo_url')).toBe(`Url: ${OISY_REPO_URL}`);
		});
	});
});
