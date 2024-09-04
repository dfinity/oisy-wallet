import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic';
import { exchanges } from '$lib/derived/exchange.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { tokens, tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenUi } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All tokens matching the selected network or chain fusion, regardless if they are enabled by the user or not.
 */
const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

const enabledNetworkTokens: Readable<Token[]> = derived([networkTokens], ([$networkTokens]) =>
	$networkTokens.filter((token) => ('enabled' in token ? token.enabled : true))
);

/**
 * It isn't performant to post filter again the Erc20 tokens that are enabled for the specific selected network or no network selected but, it's code wise convenient to avoid duplication of logic.
 */
export const enabledErc20NetworkTokens: Readable<Erc20Token[]> = derived(
	[enabledNetworkTokens],
	([$enabledNetworkTokens]) =>
		$enabledNetworkTokens.filter(({ standard }) => standard === 'erc20') as Erc20Token[]
);

/**
 * The following store is use as reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
// TODO: The several dependencies of enabledIcNetworkTokens are not strictly only IC tokens, but other tokens too.
//  We should find a better way to handle this, improving the store.
export const enabledIcNetworkTokens: Readable<IcToken[]> = derived(
	[enabledNetworkTokens],
	([$enabledNetworkTokens]) =>
		$enabledNetworkTokens.filter(
			({ standard }) => standard === 'icp' || standard === 'icrc'
		) as IcToken[]
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
