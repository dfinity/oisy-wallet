import {
	KASPA_MAINNET_ENABLED,
	KASPA_MAINNET_NETWORK,
	KASPA_TESTNET_NETWORK
} from '$env/networks/networks.kaspa.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { Network } from '$lib/types/network';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledKaspaNetworks: Readable<Network[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: KASPA_MAINNET_ENABLED,
			mainnetNetworks: [KASPA_MAINNET_NETWORK],
			testnetNetworks: [KASPA_TESTNET_NETWORK]
		})
);
