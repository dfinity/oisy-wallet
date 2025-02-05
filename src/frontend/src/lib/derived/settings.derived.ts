import { DEFAULT_THEME_NAME } from '$lib/constants/app.constants';
import type { Themes } from '$lib/enums/themes';
import { hideZeroBalancesStore, testnetsStore, themeStore } from '$lib/stores/settings.store';
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

export const selectedTheme: Readable<Themes> = derived(
	[themeStore],
	([$selectedTheme]) => $selectedTheme?.name ?? DEFAULT_THEME_NAME
);
