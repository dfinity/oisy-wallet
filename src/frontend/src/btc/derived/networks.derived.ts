import {
	BTC_MAINNET_ENABLED,
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.btc.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { Network } from '$lib/types/network';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinNetworks: Readable<Network[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: BTC_MAINNET_ENABLED,
			mainnetNetworks: [BTC_MAINNET_NETWORK],
			testnetNetworks: [BTC_TESTNET_NETWORK],
			localNetworks: [BTC_REGTEST_NETWORK]
		})
);
