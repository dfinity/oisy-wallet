import {
	SOL_MAINNET_ENABLED,
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { NetworkId } from '$lib/types/network';
import type { SolanaNetwork } from '$sol/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaNetworks: Readable<SolanaNetwork[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [
		...(SOL_MAINNET_ENABLED ? [SOLANA_MAINNET_NETWORK] : []),
		...($testnetsEnabled
			? [SOLANA_TESTNET_NETWORK, SOLANA_DEVNET_NETWORK, ...(LOCAL ? [SOLANA_LOCAL_NETWORK] : [])]
			: [])
	]
);

export const enabledSolanaNetworksIds: Readable<NetworkId[]> = derived(
	[enabledSolanaNetworks],
	([$solanaNetworks]) => $solanaNetworks.map(({ id }) => id)
);
