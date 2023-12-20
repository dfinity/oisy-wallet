import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK_ID,
	NETWORKS
} from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { icpAccountIdentifiedStore } from '$lib/derived/icp.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { networkIdStore } from '$lib/stores/network.store';
import type { OptionAddress } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, networkIdStore],
	([$tokens, $networkIdStore]) => $tokens.filter(({ network: { id } }) => id === $networkIdStore)
);

export const networkICP: Readable<boolean> = derived(
	[networkIdStore],
	([$networkIdStore]) => ICP_NETWORK_ID === $networkIdStore
);

export const networkEthereum: Readable<boolean> = derived(
	[networkIdStore],
	([$networkIdStore]) => ETHEREUM_NETWORK_ID === $networkIdStore
);

export const networkAddress: Readable<OptionAddress | string> = derived(
	[address, icpAccountIdentifiedStore, networkICP],
	([$address, $icpAccountIdentifiedStore, $networkIdStore]) =>
		$networkIdStore ? $icpAccountIdentifiedStore?.toHex() : $address
);

export const selectedNetwork: Readable<Network> = derived(
	[networkIdStore],
	([$networkIdStore]) => NETWORKS.find(({ id }) => id === $networkIdStore) ?? ETHEREUM_NETWORK
);
