import { I18N_ENABLED } from '$env/i18n';
import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.contants';
import { authSignedIn } from '$lib/derived/auth.derived';
import de from '$lib/i18n/de.json';
import en from '$lib/i18n/en.json';
import zh from '$lib/i18n/zh.json';
import { trackEvent } from '$lib/services/analytics.services';
import { Languages } from '$lib/types/languages';
import { getDefaultLang, mergeWithFallback } from '$lib/utils/i18n.utils';
import { get, set } from '$lib/utils/storage.utils';
import { get as getStore, writable, type Readable } from 'svelte/store';

const enI18n = (): I18n => ({
	...en,
	lang: Languages.ENGLISH
});

const deI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: de as I18n }),
	lang: Languages.GERMAN
});

const zhI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: zh as I18n }),
	lang: Languages.CHINESE
});

const loadLang = (lang: Languages): I18n => {
	switch (lang) {
		case Languages.GERMAN:
			return deI18n();
		case Languages.CHINESE:
			return zhI18n();
		default:
			return enI18n();
	}
};

const saveLang = (lang: Languages) => set({ key: 'lang', value: lang });

export interface I18nStore extends Readable<I18n> {
	init: () => void;
	switchLang: (lang: Languages) => void;
}

const initI18n = (): I18nStore => {
	const { subscribe, set } = writable<I18n>(I18N_ENABLED ? loadLang(getDefaultLang()) : enI18n());

	const switchLang = (lang: Languages) => {
		set(loadLang(lang));

		trackEvent({
			name: TRACK_CHANGE_LANGUAGE,
			metadata: {
				language: lang,
				source: getStore(authSignedIn) ? 'app' : 'landing-page'
			}
		});

		saveLang(lang);
	};

	return {
		subscribe,

		init: () => {
			const lang = I18N_ENABLED
				? (get<Languages>({ key: 'lang' }) ?? getDefaultLang())
				: Languages.ENGLISH;

			if (lang === getDefaultLang()) {
				saveLang(lang);
				// No need to reload the store, store is already initialised with the default
				return;
			}

			switchLang(lang);
		},

		switchLang
	};
};

export const i18n = initI18n();
