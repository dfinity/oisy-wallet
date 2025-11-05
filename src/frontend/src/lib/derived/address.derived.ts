import type { BtcAddress, OptionBtcAddress } from '$btc/types/address';
import type { OptionEthAddress } from '$eth/types/address';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { mapAddress } from '$lib/utils/address.utils';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const btcAddressMainnetNotLoaded: Readable<boolean> = derived(
	[btcAddressMainnetStore],
	([$btcAddressMainnetStore]) => isNullish($btcAddressMainnetStore)
);

export const btcAddressTestnetNotLoaded: Readable<boolean> = derived(
	[btcAddressTestnetStore],
	([$btcAddressTestnetStore]) => isNullish($btcAddressTestnetStore)
);

export const btcAddressRegtestNotLoaded: Readable<boolean> = derived(
	[btcAddressRegtestStore],
	([$btcAddressRegtestStore]) => isNullish($btcAddressRegtestStore)
);

export const ethAddressNotLoaded: Readable<boolean> = derived(
	[ethAddressStore],
	([$ethAddressStore]) => isNullish($ethAddressStore)
);

export const solAddressMainnetNotLoaded: Readable<boolean> = derived(
	[solAddressMainnetStore],
	([$solAddressMainnetStore]) => isNullish($solAddressMainnetStore)
);

export const solAddressDevnetNotLoaded: Readable<boolean> = derived(
	[solAddressDevnetStore],
	([$solAddressDevnetStore]) => isNullish($solAddressDevnetStore)
);

export const solAddressLocalnetNotLoaded: Readable<boolean> = derived(
	[solAddressLocalnetStore],
	([$solAddressLocalnetStore]) => isNullish($solAddressLocalnetStore)
);

export const btcAddressMainnet: Readable<OptionBtcAddress> = derived(
	[btcAddressMainnetStore],
	([$btcAddressMainnetStore]) => 'bc1qk8nmd4y4lzpxenkmvrck04nrdpctyfs9y7fw3e'
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
	([$ethAddressStore]) => '0xf2E508D5B8f44f08bD81c7d19e9f1f5277e31f95'
);

export const solAddressMainnet: Readable<OptionSolAddress> = derived(
	[solAddressMainnetStore],
	([$solAddressMainnetStore]) => '6t1RMTVVUVEjkxA758YMKR9Kwc9YuA3W79LCuqnctLNT'
);

export const solAddressDevnet: Readable<OptionSolAddress> = derived(
	[solAddressDevnetStore],
	([$solAddressDevnetStore]) => mapAddress<SolAddress>($solAddressDevnetStore)
);

export const solAddressLocal: Readable<OptionSolAddress> = derived(
	[solAddressLocalnetStore],
	([$solAddressLocalnetStore]) => mapAddress<SolAddress>($solAddressLocalnetStore)
);
