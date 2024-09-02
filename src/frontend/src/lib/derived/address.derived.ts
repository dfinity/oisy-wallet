import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { addressStore, type OptionAddressData } from '$lib/stores/address.store';
import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
import { mapAddress } from '$lib/utils/address.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const addressNotLoaded: Readable<boolean> = derived([addressStore], ([$addressStore]) =>
	isNullish($addressStore)
);

export const btcAddressMainnetData: Readable<OptionAddressData> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.[BTC_MAINNET_TOKEN_ID]
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[btcAddressMainnetData],
	([$btcAddressMainnetData]) => mapAddress($btcAddressMainnetData)
);

export const btcAddressMainnetCertified: Readable<boolean> = derived(
	[btcAddressMainnetData],
	([$btcAddressMainnetData]) =>
		$btcAddressMainnetData?.certified === true || !NETWORK_BITCOIN_ENABLED
);

export const btcAddressMainnetNotCertified: Readable<boolean> = derived(
	[btcAddressMainnetCertified],
	([$btcAddressMainnetCertified]) => !$btcAddressMainnetCertified
);

export const ethAddressData: Readable<OptionAddressData> = derived(
	[addressStore],
	([$addressStore]) => $addressStore?.[ETHEREUM_TOKEN_ID]
);

export const ethAddress: Readable<OptionEthAddress> = derived(
	[ethAddressData],
	([$ethAddressData]) => mapAddress($ethAddressData)
);

export const ethAddressCertified: Readable<boolean> = derived(
	[ethAddressData],
	([$ethAddressData]) => $ethAddressData?.certified === true
);

export const ethAddressNotCertified: Readable<boolean> = derived(
	[ethAddressCertified],
	([$ethAddressCertified]) => !$ethAddressCertified
);
