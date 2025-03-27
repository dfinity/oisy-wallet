import {
	SOL_MAINNET_ENABLED,
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnets } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { NetworkId } from '$lib/types/network';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import type { SolanaNetwork } from '$sol/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaNetworks: Readable<SolanaNetwork[]> = derived(
	[testnets, userNetworks],
	([$testnets, $userNetworks]) =>
		[
			...(SOL_MAINNET_ENABLED ? [SOLANA_MAINNET_NETWORK] : []),
			...($testnets
				? [SOLANA_TESTNET_NETWORK, SOLANA_DEVNET_NETWORK, ...(LOCAL ? [SOLANA_LOCAL_NETWORK] : [])]
				: [])
		].filter(({ id: networkId }) =>
			isUserNetworkEnabled({ userNetworks: $userNetworks, networkId })
		)
);

export const enabledSolanaNetworksIds: Readable<NetworkId[]> = derived(
	[enabledSolanaNetworks],
	([$solanaNetworks]) => $solanaNetworks.map(({ id }) => id)
);
