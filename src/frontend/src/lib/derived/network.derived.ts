import { ETHEREUM_NETWORK, NETWORKS } from '$lib/constants/networks.constants';
import { tokens } from '$lib/derived/tokens.derived';
import { networkId } from '$lib/stores/token.store';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, networkId],
	([$tokens, $networkId]) => $tokens.filter(({ network: { id } }) => id === $networkId)
);

export const selectedNetwork: Readable<Network> = derived(
	[networkId],
	([$networkId]) => NETWORKS.find(({ id }) => id === $networkId) ?? ETHEREUM_NETWORK
);
