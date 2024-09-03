import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
import { mapAddress } from '$lib/utils/address.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// TODO: rename it to ethAddressNotLoaded
export const addressNotLoaded: Readable<boolean> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => isNullish($ethAddressStore)
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[btcAddressMainnetStore],
	([$btcAddressMainnetStore]) => mapAddress($btcAddressMainnetStore)
);

export const ethAddress: Readable<OptionEthAddress> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => mapAddress($ethAddressStore)
);

export const ethAddressCertified: Readable<boolean> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => $ethAddressStore?.certified === true
);

export const ethAddressNotCertified: Readable<boolean> = derived(
	[ethAddressCertified],
	([$ethAddressCertified]) => !$ethAddressCertified
);
