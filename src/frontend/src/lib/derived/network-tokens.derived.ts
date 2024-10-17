import { exchanges } from '$lib/derived/exchange.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { enabledTokens, tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenUi, TokenUiOrGroupUi } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';
import { showZeroBalances } from '$lib/derived/settings.derived';
import { groupTokensByTwin } from '$lib/utils/token.utils';

/**
 * All user-enabled tokens matching the selected network or chain fusion.
 */
const enabledNetworkTokens: Readable<Token[]> = derived(
	[enabledTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

/**
 * Network tokens sorted by market cap, with the ones to pin at the top of the list.
 */
export const combinedDerivedSortedNetworkTokens: Readable<Token[]> = derived(
	[enabledNetworkTokens, tokensToPin, exchanges],
	([$tokens, $tokensToPin, $exchanges]) => sortTokens({ $tokens, $exchanges, $tokensToPin })
);

/**
 * All tokens matching the selected network or Chain Fusion, with the ones with non-null balance at the top of the list.
 */
export const combinedDerivedSortedNetworkTokensUi: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedNetworkTokens, balancesStore, exchanges],
	([$enabledNetworkTokens, $balances, $exchanges]) =>
		pinTokensWithBalanceAtTop({
			$tokens: $enabledNetworkTokens,
			$balances,
			$exchanges
		})
);

/**
 * Filtered tokens based on user settings (e.g., hiding/showing zero balances).
 */
export const combinedDerivedFilteredNetworkTokensUi: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedNetworkTokensUi, showZeroBalances],
	([$sortedTokens, $showZeroBalances]) =>
		$sortedTokens.filter(
			({ balance, usdBalance }) =>
				Number(balance ?? 0n) !== 0 || (usdBalance ?? 0) !== 0 || $showZeroBalances
		)
);

/**
 * Grouped tokens by twin symbols and filtered by user settings.
 */
export const combinedDerivedGroupedTokensUi: Readable<TokenUiOrGroupUi[]> = derived(
	[combinedDerivedFilteredNetworkTokensUi],
	([$filteredTokens]) => groupTokensByTwin($filteredTokens)
);