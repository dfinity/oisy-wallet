import { defaultThemeName, hideZeroBalancesStore, testnetsStore, themeStore, type ThemeType } from '$lib/stores/settings.store';
import { derived, type Readable } from 'svelte/store';

export const testnetsEnabled: Readable<boolean> = derived(
	[testnetsStore],
	([$testnetsStore]) => $testnetsStore?.enabled ?? false
);

export const hideZeroBalances: Readable<boolean> = derived(
	[hideZeroBalancesStore],
	([$hideZeroBalancesStore]) => $hideZeroBalancesStore?.enabled ?? false
);

export const showZeroBalances: Readable<boolean> = derived(
	[hideZeroBalances],
	([$hideZeroBalances]) => !$hideZeroBalances
);

export const selectedTheme: Readable<ThemeType> = derived(
	[themeStore],
	([$selectedTheme]) => $selectedTheme?.name ?? defaultThemeName
);
