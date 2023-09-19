import { page } from '$app/stores';
import { AIRDROP } from '$lib/constants/airdrop.constants';
import { airdropStore } from '$lib/stores/airdrop.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const airdropCode: Readable<string | null | undefined> = derived([page], ([$page]) => {
	const {
		data: { airdrop }
	} = $page;

	return airdrop;
});

export const airdropAvailable: Readable<boolean> = derived(
	airdropStore,
	($airdrop) => nonNullish($airdrop) && AIRDROP
);
