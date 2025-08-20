import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.contants';
import { authSignedIn } from '$lib/derived/auth.derived';
import { Languages } from '$lib/enums/languages';
import cs from '$lib/i18n/cs.json';
import de from '$lib/i18n/de.json';
import en from '$lib/i18n/en.json';
import fr from '$lib/i18n/fr.json';
import it from '$lib/i18n/it.json';
import ja from '$lib/i18n/ja.json';
import pt from '$lib/i18n/pt.json';
import vi from '$lib/i18n/vi.json';
import zhcn from '$lib/i18n/zh-CN.json';
import { trackEvent } from '$lib/services/analytics.services';
import { getDefaultLang, mergeWithFallback } from '$lib/utils/i18n.utils';
import { get, set } from '$lib/utils/storage.utils';
import { get as getStore, writable, type Readable } from 'svelte/store';

export const enI18n = (): I18n => ({
	...en,
	lang: Languages.ENGLISH
});

const csI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: cs as I18n }),
	lang: Languages.CZECH
});

const deI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: de as I18n }),
	lang: Languages.GERMAN
});

const frI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: fr as I18n }),
	lang: Languages.FRENCH
});

const itI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: it as I18n }),
	lang: Languages.ITALIAN
});

const jaI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: ja as I18n }),
	lang: Languages.JAPANESE
});

const ptI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: pt as I18n }),
	lang: Languages.PORTUGUESE
});

const viI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: vi as I18n }),
	lang: Languages.VIETNAMESE
});

const zhcnI18n = (): I18n => ({
	...mergeWithFallback({ refLang: enI18n(), targetLang: zhcn as I18n }),
	lang: Languages.CHINESE_SIMPLIFIED
});

const loadLang = (lang: Languages): I18n => {
	switch (lang) {
		case Languages.CHINESE_SIMPLIFIED:
			return zhcnI18n();
		case Languages.CZECH:
			return csI18n();
		case Languages.FRENCH:
			return frI18n();
		case Languages.GERMAN:
			return deI18n();
		case Languages.ITALIAN:
			return itI18n();
		case Languages.JAPANESE:
			return jaI18n();
		case Languages.PORTUGUESE:
			return ptI18n();
		case Languages.VIETNAMESE:
			return viI18n();
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
	const { subscribe, set } = writable<I18n>(loadLang(getDefaultLang()));

	const switchLang = ({ lang, track = true }: { lang: Languages; track?: boolean }) => {
		set(loadLang(lang));

		if (track) {
			trackEvent({
				name: TRACK_CHANGE_LANGUAGE,
				metadata: {
					language: lang,
					source: getStore(authSignedIn) ? 'app' : 'landing-page'
				}
			});
		}

		saveLang(lang);
	};

	return {
		subscribe,

		init: () => {
			const lang = get<Languages>({ key: 'lang' }) ?? getDefaultLang();

			if (lang === getDefaultLang()) {
				saveLang(lang);
				// No need to reload the store, store is already initialised with the default
				return;
			}

			switchLang({ lang, track: false });
		},

		switchLang: (lang: Languages) => switchLang({ lang })
	};
};

export const i18n = initI18n();
