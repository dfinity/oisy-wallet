import { addressStore } from '$lib/stores/address.store';
import type { OptionAddress } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const address: Readable<OptionAddress> = derived([addressStore], ([$addressStore]) =>
	$addressStore === null ? null : $addressStore?.address
);

export const addressCertified: Readable<boolean> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.certified === true
);

export const addressNotCertified: Readable<boolean> = derived(
	[addressCertified],
	([$addressCertified]) => !$addressCertified
);
