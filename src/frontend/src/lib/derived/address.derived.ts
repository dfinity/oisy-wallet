import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { addressStore } from '$lib/stores/address.store';
import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[addressStore],
	([$addressStore]) =>
		$addressStore?.[BTC_MAINNET_TOKEN_ID] === null
			? null
			: $addressStore?.[BTC_MAINNET_TOKEN_ID]?.data
);

export const ethAddress: Readable<OptionEthAddress> = derived([addressStore], ([$addressStore]) =>
	$addressStore?.[ETHEREUM_TOKEN_ID] === null ? null : $addressStore?.[ETHEREUM_TOKEN_ID]?.data
);

export const ethAddressCertified: Readable<boolean> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.[ETHEREUM_TOKEN_ID]?.certified === true
);

export const ethAddressNotCertified: Readable<boolean> = derived(
	[ethAddressCertified],
	([$ethAddressCertified]) => !$ethAddressCertified
);
