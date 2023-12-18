import { addressStore, type AddressData } from '$lib/stores/address.store';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const address: Readable<AddressData> = derived(
	[addressStore],
	([$addressStore]) => $addressStore
);
