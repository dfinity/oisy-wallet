import { exchanges } from '$lib/derived/exchange.derived';
import { enabledTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import { sumMainnetTokensUsdBalancesPerNetwork } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A store with NetworkId-number dictionary with total USD balance of mainnet tokens per network.
 */
export const enabledMainnetTokensUsdBalancesPerNetwork: Readable<TokensTotalUsdBalancePerNetwork> =
	derived([enabledTokens, balancesStore, exchanges], ([$enabledTokens, $balances, $exchanges]) =>
		sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: $enabledTokens,
			$balances,
			$exchanges
		})
	);
