import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { addressStore } from '$lib/stores/address.store';
import type { OptionEthAddress } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const ethAddress: Readable<OptionEthAddress> = derived([addressStore], ([$addressStore]) =>
	$addressStore?.[ETHEREUM_TOKEN_ID] === null ? null : $addressStore?.[ETHEREUM_TOKEN_ID]?.data
);

export const addressCertified: Readable<boolean> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.[ETHEREUM_TOKEN_ID]?.certified === true
);

export const addressNotCertified: Readable<boolean> = derived(
	[addressCertified],
	([$addressCertified]) => !$addressCertified
);
