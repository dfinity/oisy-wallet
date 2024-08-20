import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { addressStore } from '$lib/stores/address.store';
import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
import { getNullableAddress } from '$lib/utils/address.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[addressStore],
	([$addressStore]) => getNullableAddress({ $addressStore, tokenId: BTC_MAINNET_TOKEN_ID })
);

export const ethAddress: Readable<OptionEthAddress> = derived([addressStore], ([$addressStore]) =>
	getNullableAddress({ $addressStore, tokenId: ETHEREUM_TOKEN_ID })
);

export const addressCertified: Readable<boolean> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.[ETHEREUM_TOKEN_ID]?.certified === true
);

export const addressNotCertified: Readable<boolean> = derived(
	[addressCertified],
	([$addressCertified]) => !$addressCertified
);
