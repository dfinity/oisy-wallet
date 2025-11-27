import { enabledFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import {
	sumMainnetTokensUsdBalancesPerNetwork,
	sumMainnetTokensUsdStakeBalancesPerNetwork
} from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A store with a NetworkId-number dictionary with a total USD balance of mainnet tokens per network.
 */
export const enabledMainnetTokensUsdBalancesPerNetwork: Readable<TokensTotalUsdBalancePerNetwork> =
	derived([enabledFungibleTokensUi], ([$enabledTokens]) =>
		sumMainnetTokensUsdBalancesPerNetwork({
			tokens: $enabledTokens
		})
	);

/**
 * A store with a NetworkId-number dictionary with total USD stake balance (including claimable rewards) of mainnet tokens per network.
 */
export const enabledMainnetTokensUsdStakeBalancesPerNetwork: Readable<TokensTotalUsdBalancePerNetwork> =
	derived([enabledFungibleTokensUi], ([$enabledTokens]) =>
		sumMainnetTokensUsdStakeBalancesPerNetwork({
			tokens: $enabledTokens
		})
	);
