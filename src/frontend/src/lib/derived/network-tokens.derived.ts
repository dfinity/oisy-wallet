import { exchanges } from '$lib/derived/exchange.derived';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import {
	enabledFungibleTokens,
	enabledNonFungibleTokens,
	tokensToPin
} from '$lib/derived/tokens.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { balancesStore } from '$lib/stores/balances.store';
import type { NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { distinctDerived } from '$lib/utils/derived.utils';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { sortTokens } from '$lib/utils/tokens.utils';
import type { Readable } from 'svelte/store';

/**
 * All user-enabled fungible tokens matching the selected network or chain fusion.
 */
export const enabledFungibleNetworkTokens: Readable<Token[]> = distinctDerived(
	[enabledFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

/**
 * All user-enabled non-fungible tokens matching the selected network or chain fusion.
 */
export const enabledNonFungibleNetworkTokens: Readable<NonFungibleToken[]> = distinctDerived(
	[enabledNonFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

export const enabledNonFungibleNetworkTokensWithoutSpam: Readable<NonFungibleToken[]> =
	distinctDerived([enabledNonFungibleNetworkTokens], ([$enabledNonFungibleNetworkTokens]) =>
		$enabledNonFungibleNetworkTokens.filter(({ section }) => section != CustomTokenSection.SPAM)
	);

/**
 * All fungible tokens matching the selected network or Chain Fusion, with the ones with non-null balance at the top of the list.
 */
export const sortedFungibleNetworkTokensUi: Readable<TokenUi[]> = distinctDerived(
	[enabledFungibleNetworkTokens, tokensToPin, balancesStore, stakeBalances, exchanges],
	([$enabledNetworkTokens, $tokensToPin, $balances, $stakeBalances, $exchanges]) =>
		sortTokens({
			$tokens: $enabledNetworkTokens,
			$balances,
			$stakeBalances,
			$exchanges,
			$tokensToPin
		})
);
