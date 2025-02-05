import { initStorageStore } from '$lib/stores/storage.store';
import type { Themes } from '$lib/enums/themes';
import { Themes } from '$lib/enums/themes';

export interface SettingsData {
	enabled: boolean;
}

export type ThemeType = 'light' | 'dark' | 'system';

export interface SettingsThemeData {
	name: Themes
}

export const testnetsStore = initStorageStore<SettingsData>({ key: 'testnets' });
export const hideZeroBalancesStore = initStorageStore<SettingsData>({ key: 'hide-zero-balances' });

export const defaultThemeName: Themes = Themes.SYSTEM;
export const themeStore = initStorageStore<SettingsThemeData>({ key: 'theme' });
