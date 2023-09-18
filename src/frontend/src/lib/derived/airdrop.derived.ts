import { airdropStore } from '$lib/stores/airdrop.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const airdropAvailable: Readable<boolean> = derived(airdropStore, ($airdrop) =>
	nonNullish($airdrop)
);
