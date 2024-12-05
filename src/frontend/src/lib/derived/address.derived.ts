import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore
} from '$lib/stores/address.store';
import type {
	BtcAddress,
	EthAddress,
	OptionBtcAddress,
	OptionEthAddress
} from '$lib/types/address';
import { mapAddress } from '$lib/utils/address.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const ethAddressNotLoaded: Readable<boolean> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => isNullish($ethAddressStore)
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[btcAddressMainnetStore],
	([$btcAddressMainnetStore]) => mapAddress<BtcAddress>($btcAddressMainnetStore)
);

export const btcAddressTestnet: Readable<OptionBtcAddress> = derived(
	[btcAddressTestnetStore],
	([$btcAddressTestnetStore]) => mapAddress<BtcAddress>($btcAddressTestnetStore)
);

export const btcAddressRegtest: Readable<OptionBtcAddress> = derived(
	[btcAddressRegtestStore],
	([$btcAddressRegtestStore]) => mapAddress<BtcAddress>($btcAddressRegtestStore)
);

export const ethAddress: Readable<OptionEthAddress> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => mapAddress<EthAddress>($ethAddressStore)
);

export const ethAddressCertified: Readable<boolean> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => $ethAddressStore?.certified === true
);

export const ethAddressNotCertified: Readable<boolean> = derived(
	[ethAddressCertified],
	([$ethAddressCertified]) => !$ethAddressCertified
);
