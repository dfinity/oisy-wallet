import {
	hideZeroBalancesStore,
	nftGroupByCollectionStore,
	nftSortStore,
	privacyModeStore,
	showHiddenStore,
	showSpamStore,
	type NftSortOrder,
	type NftSortType
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

export const nftSortOrder: Readable<NftSortOrder> = derived(
	[nftSortStore],
	([$nftSortStore]) => $nftSortStore.order
);

export const nftSortType: Readable<NftSortType> = derived(
	[nftSortStore],
	([$nftSortStore]) => $nftSortStore.type
);

export const nftGroupByCollection: Readable<boolean> = derived(
	[nftGroupByCollectionStore],
	([$nftGroupByCollectionStore]) => $nftGroupByCollectionStore
);
