import { exchanges } from '$lib/derived/exchange.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { enabledFungibleTokens, tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenUi } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All user-enabled fungible tokens matching the selected network or chain fusion.
 */
// TODO: Create tests for this store
export const enabledFungibleNetworkTokens: Readable<Token[]> = derived(
	[enabledFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

/**
 * Fungible network tokens sorted by market cap, with the ones to pin at the top of the list.
 */
export const combinedDerivedSortedFungibleNetworkTokens: Readable<Token[]> = derived(
	[enabledFungibleNetworkTokens, tokensToPin, exchanges],
	([$tokens, $tokensToPin, $exchanges]) => sortTokens({ $tokens, $exchanges, $tokensToPin })
);

/**
 * All fungible tokens matching the selected network or Chain Fusion, with the ones with non-null balance at the top of the list.
 */
export const combinedDerivedSortedFungibleNetworkTokensUi: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedFungibleNetworkTokens, balancesStore, exchanges],
	([$enabledNetworkTokens, $balances, $exchanges]) =>
		pinTokensWithBalanceAtTop({
			$tokens: $enabledNetworkTokens,
			$balances,
			$exchanges
		})
);
