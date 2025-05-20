import {
	POLYGON_AMOY_NETWORK,
	POLYGON_MAINNET_ENABLED,
	POLYGON_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledPolygonNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: POLYGON_MAINNET_ENABLED,
			mainnetNetworks: [POLYGON_MAINNET_NETWORK],
			testnetNetworks: [POLYGON_AMOY_NETWORK]
		})
);
