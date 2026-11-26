import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import type { Token } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All fungible tokens matching the selected network or chain fusion.
 */
export const allFungibleNetworkTokens: Readable<Token[]> = derived(
	[allFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);
