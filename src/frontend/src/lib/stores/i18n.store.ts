import { Languages } from '$lib/enums/languages';
import en from '$lib/i18n/en.json';
import { getDefaultLang, mergeWithFallback } from '$lib/utils/i18n.utils';
import { get, set } from '$lib/utils/storage.utils';
import { writable, type Readable } from 'svelte/store';

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

const updateHtmlLang = (lang: Languages) => document.documentElement.setAttribute('lang', lang);

const saveLang = (lang: Languages) => set({ key: 'lang', value: lang });

export interface I18nStore extends Readable<I18n> {
	init: () => Promise<void>;
	switchLang: (lang: Languages) => Promise<void>;
}

const initI18n = (): I18nStore => {
	const { subscribe, set } = writable<I18n>(enI18n());

	const switchLang = async (lang: Languages) => {
		const language = await loadLang(lang);

		set(language);

		updateHtmlLang(lang);

		saveLang(lang);
	};

	return {
		subscribe,

		init: async () => {
			const lang = get<Languages>({ key: 'lang' }) ?? getDefaultLang();

			// English is the default one in case no language is set.
			// Or either way is what most users would have as default in their machines.
			if (lang === Languages.ENGLISH) {
				saveLang(lang);
				// No need to reload the store, store is already initialised with the default
				return;
			}

			await switchLang(lang);
		},

		switchLang
	};
};

export const i18n = initI18n();
