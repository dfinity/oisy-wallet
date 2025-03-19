import { hideZeroBalancesStore } from '$lib/stores/settings.store';
import { derived, type Readable } from 'svelte/store';

export const hideZeroBalances: Readable<boolean> = derived(
	[hideZeroBalancesStore],
	([$hideZeroBalancesStore]) => $hideZeroBalancesStore?.enabled ?? false
);

export const showZeroBalances: Readable<boolean> = derived(
	[hideZeroBalances],
	([$hideZeroBalances]) => !$hideZeroBalances
);
