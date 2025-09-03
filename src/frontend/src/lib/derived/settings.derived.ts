import {
	hideZeroBalancesStore,
	privacyModeStore,
	showHiddenStore,
	showSpamStore
} from '$lib/stores/settings.store';
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

export const showHidden: Readable<boolean> = derived(
	[showHiddenStore],
	([$showHiddenStore]) => $showHiddenStore.enabled
);

export const showSpam: Readable<boolean> = derived(
	[showSpamStore],
	([$showSpamStore]) => $showSpamStore.enabled
);
