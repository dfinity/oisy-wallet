import {
	ROBINHOOD_MAINNET_ENABLED,
	ROBINHOOD_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledRobinhoodNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ROBINHOOD_MAINNET_ENABLED,
			mainnetNetworks: [ROBINHOOD_MAINNET_NETWORK]
		})
);
