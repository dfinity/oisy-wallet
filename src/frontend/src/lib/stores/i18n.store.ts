import { I18N_ENABLED } from '$env/i18n';
import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.contants';
import { authSignedIn } from '$lib/derived/auth.derived';
import de from '$lib/i18n/de.json';
import en from '$lib/i18n/en.json';
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

const loadLang = (lang: Languages): I18n => {
	switch (lang) {
		case Languages.GERMAN:
			return deI18n();
		default:
			return enI18n();
	}
};

const saveLang = (lang: Languages) => set({ key: 'lang', value: lang });

export interface I18nStore extends Readable<I18n> {
	init: () => Promise<void>;
	switchLang: (lang: Languages) => Promise<void>;
}

const initI18n = (): I18nStore => {
	const { subscribe, set } = writable<I18n>(loadLang(getDefaultLang()));

	const switchLang = async (lang: Languages) => {
		const bundle = loadLang(lang);
		set(bundle);

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

		init: async () => {
			console.log('i18n is ' + (I18N_ENABLED ? 'enabled' : 'not enabled'));
			console.log(getDefaultLang());
			const lang = I18N_ENABLED
				? (get<Languages>({ key: 'lang' }) ?? getDefaultLang())
				: Languages.ENGLISH;
			console.log(lang);

			if (lang === getDefaultLang()) {
				saveLang(lang);
				// No need to reload the store, English is already the default
				return;
			}

			await switchLang(lang);
		},

		switchLang
	};
};

export const i18n = initI18n();
