import { isTokenIc } from '$icp/utils/icrc.utils';
import { exchanges } from '$lib/derived/exchange.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenUi } from '$lib/types/token-ui';
import { mapTokenUi } from '$lib/utils/token.utils';
import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All user-enabled fungible tokens with financial data.
 */
export const enabledFungibleTokensUi: Readable<TokenUi[]> = derived(
	[enabledFungibleTokens, balancesStore, exchanges],
	([$enabledFungibleTokens, $balances, $exchanges]) =>
		$enabledFungibleTokens.map((token) =>
			mapTokenUi({
				token,
				$balances,
				$exchanges
			})
		)
);

export const enabledMainnetFungibleTokensUsdBalance: Readable<number> = derived(
	[enabledFungibleTokensUi],
	([$enabledFungibleTokensUi]) =>
		sumTokensUiUsdBalance(
			$enabledFungibleTokensUi.filter(({ network: { env } }) => env !== 'testnet')
		)
);

export const enabledMainnetFungibleIcTokensUsdBalance: Readable<number> = derived(
	[enabledFungibleTokensUi],
	([$enabledFungibleTokensUi]) =>
		sumTokensUiUsdBalance(
			$enabledFungibleTokensUi.filter(
				(token) => isTokenIc(token) && token.network.env !== 'testnet'
			)
		)
);
