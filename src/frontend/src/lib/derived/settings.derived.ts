import { hideZeroBalancesStore, privacyModeStore, showSpamStore } from '$lib/stores/settings.store';
import { derived, type Readable } from 'svelte/store';

export const hideZeroBalances: Readable<boolean> = derived(
	[hideZeroBalancesStore],
	([$hideZeroBalancesStore]) => $hideZeroBalancesStore.enabled
);

export const showZeroBalances: Readable<boolean> = derived(
	[hideZeroBalances],
	([$hideZeroBalances]) => !$hideZeroBalances
);

export const isPrivacyMode: Readable<boolean> = derived(
	[privacyModeStore],
	([$privacyModeStore]) => $privacyModeStore.enabled
);

export const showSpam: Readable<boolean> = derived(
	[showSpamStore],
	([$showSpamStore]) => $showSpamStore.enabled
)
