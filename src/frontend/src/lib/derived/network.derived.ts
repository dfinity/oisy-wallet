import {
	ETHEREUM_NETWORK,
	ETHEREUM_NETWORK_ID,
	ICP_NETWORK_ID,
	NETWORKS
} from '$lib/constants/networks.constants';
import { address } from '$lib/derived/address.derived';
import { icpAccountIdentifiedStore } from '$lib/derived/icp.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { networkId } from '$lib/stores/token.store';
import type { OptionAddress } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, networkId],
	([$tokens, $networkId]) => $tokens.filter(({ network: { id } }) => id === $networkId)
);

export const networkICP: Readable<boolean> = derived(
	[networkId],
	([$networkId]) => ICP_NETWORK_ID === $networkId
);

export const networkEthereum: Readable<boolean> = derived(
	[networkId],
	([$networkId]) => ETHEREUM_NETWORK_ID === $networkId
);

export const networkAddress: Readable<OptionAddress | string> = derived(
	[address, icpAccountIdentifiedStore, networkICP],
	([$address, $icpAccountIdentifiedStore, $networkICP]) =>
		$networkICP ? $icpAccountIdentifiedStore?.toHex() : $address
);

export const selectedNetwork: Readable<Network> = derived(
	[networkId],
	([$networkId]) => NETWORKS.find(({ id }) => id === $networkId) ?? ETHEREUM_NETWORK
);
