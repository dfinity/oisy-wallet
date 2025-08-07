import { currentLanguage } from '$lib/derived/i18n.derived';
import { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';

describe('i18n.derived', () => {
	describe('currentLanguage', () => {
		beforeEach(() => {
			i18n.init();
		});

		it('should initialize with the default language', () => {
			expect(get(currentLanguage)).toEqual(Languages.ENGLISH);
		});

		it('should return the current language from the i18n store', () => {
			expect(get(currentLanguage)).toEqual(Languages.ENGLISH);

			i18n.switchLang(Languages.GERMAN);

			expect(get(currentLanguage)).toEqual(Languages.GERMAN);

			i18n.switchLang(Languages.ITALIAN);

			expect(get(currentLanguage)).toEqual(Languages.ITALIAN);
		});
	});
});
