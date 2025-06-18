import en from '$lib/i18n/en.json';
import { Languages } from '$lib/types/languages';
import { get, set } from '$lib/utils/storage.utils';
import { writable, type Readable } from 'svelte/store';

const enI18n = (): I18n => ({
	...en,
	lang: Languages.ENGLISH
});

const loadLang = (lang: Languages): Promise<I18n> => {
	switch (lang) {
		default:
			return Promise.resolve(enI18n());
	}
};

const saveLang = (lang: Languages) => set({ key: 'lang', value: lang });

export interface I18nStore extends Readable<I18n> {
	init: () => Promise<void>;
	switchLang: (lang: Languages) => Promise<void>;
}

const initI18n = (): I18nStore => {
	const { subscribe, set } = writable<I18n>(enI18n());

	const switchLang = async (lang: Languages) => {
		const bundle = await loadLang(lang);
		set(bundle);

		saveLang(lang);
	};

	return {
		subscribe,

		init: async () => {
			const lang = get<Languages>({ key: 'lang' }) ?? Languages.ENGLISH;

			if (lang === Languages.ENGLISH) {
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
