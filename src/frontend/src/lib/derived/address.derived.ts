import type { BtcAddress, OptionBtcAddress } from '$btc/types/address';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { KaspaAddress, OptionKaspaAddress } from '$kaspa/types/address';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	kaspaAddressMainnetStore,
	kaspaAddressTestnetStore,
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

export const solAddressMainnet: Readable<OptionSolAddress> = derived(
	[solAddressMainnetStore],
	([$solAddressMainnetStore]) => mapAddress<SolAddress>($solAddressMainnetStore)
);

export const solAddressDevnet: Readable<OptionSolAddress> = derived(
	[solAddressDevnetStore],
	([$solAddressDevnetStore]) => mapAddress<SolAddress>($solAddressDevnetStore)
);

export const solAddressLocal: Readable<OptionSolAddress> = derived(
	[solAddressLocalnetStore],
	([$solAddressLocalnetStore]) => mapAddress<SolAddress>($solAddressLocalnetStore)
);

export const kaspaAddressMainnetNotLoaded: Readable<boolean> = derived(
	[kaspaAddressMainnetStore],
	([$kaspaAddressMainnetStore]) => isNullish($kaspaAddressMainnetStore)
);

export const kaspaAddressTestnetNotLoaded: Readable<boolean> = derived(
	[kaspaAddressTestnetStore],
	([$kaspaAddressTestnetStore]) => isNullish($kaspaAddressTestnetStore)
);

export const kaspaAddressMainnet: Readable<OptionKaspaAddress> = derived(
	[kaspaAddressMainnetStore],
	([$kaspaAddressMainnetStore]) => mapAddress<KaspaAddress>($kaspaAddressMainnetStore)
);

export const kaspaAddressTestnet: Readable<OptionKaspaAddress> = derived(
	[kaspaAddressTestnetStore],
	([$kaspaAddressTestnetStore]) => mapAddress<KaspaAddress>($kaspaAddressTestnetStore)
);
