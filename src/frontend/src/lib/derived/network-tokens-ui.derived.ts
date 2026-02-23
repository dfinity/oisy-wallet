import { exchanges } from '$lib/derived/exchange.derived';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { tokensSortType } from '$lib/derived/settings.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenUi } from '$lib/types/token-ui';
import { sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const sortedFungibleNetworkTokensUi: Readable<TokenUi[]> = derived(
	[
		enabledFungibleNetworkTokens,
		tokensToPin,
		balancesStore,
		stakeBalances,
		exchanges,
		tokensSortType
	],
	([$tokens, $tokensToPin, $balances, $stakeBalances, $exchanges, $tokensSortType]) =>
		sortTokens({
			$tokens,
			$balances,
			$stakeBalances,
			$exchanges,
			$tokensToPin,
			primarySortStrategy: $tokensSortType
		})
);
