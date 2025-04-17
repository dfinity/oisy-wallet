import {
	SOL_MAINNET_ENABLED,
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { NetworkId } from '$lib/types/network';
import { filterEnabledNetworks } from '$lib/utils/networks.utils';
import type { SolanaNetwork } from '$sol/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaNetworks: Readable<SolanaNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		filterEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: SOL_MAINNET_ENABLED,
			mainnetNetworks: [SOLANA_MAINNET_NETWORK],
			testnetNetworks: [SOLANA_TESTNET_NETWORK, SOLANA_DEVNET_NETWORK],
			localNetworks: [SOLANA_LOCAL_NETWORK]
		})
);

export const enabledSolanaNetworksIds: Readable<NetworkId[]> = derived(
	[enabledSolanaNetworks],
	([$solanaNetworks]) => $solanaNetworks.map(({ id }) => id)
);
