import type { Erc20Token } from '$eth/types/erc20';
import { exchanges } from '$lib/derived/exchange.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { combinedDerivedSortedTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenUi } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All tokens matching the selected network or chain fusion, regardless if they are enabled by the user or not.
 */
const networkTokens: Readable<Token[]> = derived(
	[combinedDerivedSortedTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

export const enabledNetworkTokens: Readable<Token[]> = derived(
	[networkTokens],
	([$networkTokens]) =>
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
 * All tokens matching the selected network or Chain Fusion, with their financial data.
 */
export const combinedDerivedEnabledNetworkTokensUi: Readable<TokenUi[]> = derived(
	[enabledNetworkTokens, balancesStore, exchanges],
	([$enabledNetworkTokens, $balancesStore, $exchanges]) =>
		$enabledNetworkTokens.map((token) => ({
			...token,
			usdBalance: nonNullish($exchanges?.[token.id]?.usd)
				? usdValue({
						token,
						balances: $balancesStore,
						exchanges: $exchanges
					})
				: undefined
		}))
);

/**
 * All tokens matching the selected network or Chain Fusion, with the ones with non-null balance at the top of the list.
 */
export const combinedDerivedSortedNetworkTokensUi: Readable<TokenUi[]> = derived(
	[combinedDerivedEnabledNetworkTokensUi, balancesStore],
	([$enabledNetworkTokensUi, $balancesStore]) =>
		pinTokensWithBalanceAtTop({
			$tokens: $enabledNetworkTokensUi,
			$balancesStore: $balancesStore
		})
);
