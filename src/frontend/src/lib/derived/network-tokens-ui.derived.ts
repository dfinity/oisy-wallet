import { exchanges } from '$lib/derived/exchange.derived';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { networks } from '$lib/derived/networks.derived';
import { tokensSortType } from '$lib/derived/settings.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { groupTokens } from '$lib/utils/token-group.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import { sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledFungibleNetworkTokensUi: Readable<TokenUi[]> = derived(
	[enabledFungibleNetworkTokens, balancesStore, stakeBalances, exchanges],
	([$tokens, $balances, $stakeBalances, $exchanges]) =>
		$tokens.map((token) =>
			mapTokenUi({
				token,
				$balances,
				$stakeBalances,
				$exchanges
			})
		)
);

export const sortedEnabledNetworkTokenUiOrGroupUi: Readable<TokenUiOrGroupUi[]> = derived(
	[enabledFungibleNetworkTokensUi, tokensToPin, tokensSortType, networks],
	([$tokens, $tokensToPin, $tokensSortType, $networks]) =>
		sortTokens({
			$tokens: groupTokens($tokens),
			$tokensToPin,
			$networksToPin: $networks,
			primarySortStrategy: $tokensSortType
		})
);
