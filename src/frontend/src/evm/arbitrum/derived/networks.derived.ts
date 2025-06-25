import {
	ARBITRUM_MAINNET_ENABLED,
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledArbitrumNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ARBITRUM_MAINNET_ENABLED,
			mainnetNetworks: [ARBITRUM_MAINNET_NETWORK],
			testnetNetworks: [ARBITRUM_SEPOLIA_NETWORK]
		})
);
