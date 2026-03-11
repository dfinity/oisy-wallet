import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import type { Token } from '$lib/types/token';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { tokenListEqual } from '$lib/utils/tokens.utils';
import type { Readable } from 'svelte/store';

/**
 * All fungible tokens matching the selected network or chain fusion.
 */
export const allFungibleNetworkTokens: Readable<Token[]> = derivedMemo(
	[allFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork,
	tokenListEqual
);
