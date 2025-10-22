import { TRACK_CHANGE_LANGUAGE } from '$lib/constants/analytics.constants';
import { authSignedIn } from '$lib/derived/auth.derived';
import { Languages } from '$lib/enums/languages';
import en from '$lib/i18n/en.json';
import { trackEvent } from '$lib/services/analytics.services';
import { getDefaultLang, mergeWithFallback } from '$lib/utils/i18n.utils';
import { get, set } from '$lib/utils/storage.utils';
import { get as getStore, writable, type Readable } from 'svelte/store';

export const enI18n = (): I18n => ({
	...en,
	lang: Languages.ENGLISH
});

const loadLangI18n = async (lang: Languages): Promise<I18n> => {
	const langMod = await import(`$lib/i18n/${lang}.json`);

	return {
		...mergeWithFallback({ refLang: enI18n(), targetLang: langMod.default }),
		lang
	};
};

const loadLang = async (lang: Languages): Promise<I18n> => {
	try {
		return await loadLangI18n(lang);
	} catch (_: unknown) {
		return enI18n();
	}
};

const saveLang = (lang: Languages) => set({ key: 'lang', value: lang });

export interface I18nStore extends Readable<I18n> {
	init: () => Promise<void>;
	switchLang: (lang: Languages) => Promise<void>;
}

const initI18n = (): I18nStore => {
	const { subscribe, set } = writable<I18n>(enI18n());

	const switchLang = async ({ lang, track = true }: { lang: Languages; track?: boolean }) => {
		const language = await loadLang(lang);

		set(language);

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

		init: async () => {
			const lang = get<Languages>({ key: 'lang' }) ?? getDefaultLang();

			if (lang === getDefaultLang()) {
				saveLang(lang);
				// No need to reload the store, store is already initialised with the default
				return;
			}

			await switchLang({ lang, track: false });
		},

		switchLang: (lang: Languages) => switchLang({ lang })
	};
};

export const i18n = initI18n();
