import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { networkId } from '$lib/derived/network.derived';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import type {
	BtcAddress,
	EthAddress,
	OptionBtcAddress,
	OptionEthAddress,
	OptionSolAddress,
	SolAddress
} from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
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

export const solAddressMainnet: Readable<OptionSolAddress> = derived(
	[solAddressMainnetStore],
	([$solAddressMainnetStore]) => mapAddress<SolAddress>($solAddressMainnetStore)
);

export const solAddressTestnet: Readable<OptionSolAddress> = derived(
	[solAddressTestnetStore],
	([$solAddressTestnetStore]) => mapAddress<SolAddress>($solAddressTestnetStore)
);

export const solAddressDevnet: Readable<OptionSolAddress> = derived(
	[solAddressDevnetStore],
	([$solAddressDevnetStore]) => mapAddress<SolAddress>($solAddressDevnetStore)
);

export const solAddressLocal: Readable<OptionSolAddress> = derived(
	[solAddressLocalnetStore],
	([$solAddressLocalnetStore]) => mapAddress<SolAddress>($solAddressLocalnetStore)
);

export const solAddress: Readable<OptionSolAddress> = derived(
	[networkId, solAddressMainnet, solAddressTestnet, solAddressDevnet, solAddressLocal],
	([$networkId, $solAddressMainnet, $solAddressTestnet, $solAddressDevnet, $solAddressLocal]) => {
		if (isNullish($networkId)) {
			return undefined;
		}

		const solanaAddressMapper: Record<NetworkId, OptionSolAddress> = {
			[SOLANA_MAINNET_NETWORK_ID]: $solAddressMainnet,
			[SOLANA_TESTNET_NETWORK_ID]: $solAddressTestnet,
			[SOLANA_DEVNET_NETWORK_ID]: $solAddressDevnet,
			[SOLANA_LOCAL_NETWORK_ID]: $solAddressLocal
		};

		return solanaAddressMapper[$networkId] ?? null;
	}
);
