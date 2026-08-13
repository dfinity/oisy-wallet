import type { Theme } from '$lib/types/theme';
import {
	applyTheme,
	getThemeFromSystemSettings,
	initTheme,
	resetTheme
} from '$lib/utils/theme.utils';
import { writable, type Readable } from 'svelte/store';

export type ThemeStoreData = Theme | undefined;

export interface ThemeStore extends Readable<ThemeStoreData> {
	select: (theme: Theme) => void;
	resetToSystemSettings: () => void;
}

export const initThemeStore = (): ThemeStore => {
	const initialTheme: ThemeStoreData = initTheme();

	const { subscribe, set } = writable<ThemeStoreData>(initialTheme);

	return {
		subscribe,

		select: (theme: Theme) => {
			applyTheme({ theme, preserve: true });
			set(theme);
		},

		resetToSystemSettings: () => {
			const theme = getThemeFromSystemSettings();
			resetTheme(theme);
			set(theme);
		}
	};
};

export const themeStore = initThemeStore();
