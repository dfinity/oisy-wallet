import { exchanges } from '$lib/derived/exchange.derived';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { tokensSortType } from '$lib/derived/settings.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { tokensToPin } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { groupTokens } from '$lib/utils/token-group.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import { sortTokensUi } from '$lib/utils/tokens-ui.utils';
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

export const enabledNetworkTokenUiOrGroupUi: Readable<TokenUiOrGroupUi[]> = derived(
	[enabledFungibleNetworkTokensUi],
	([$tokens]) => groupTokens($tokens)
);

export const sortedEnabledNetworkTokenUiOrGroupUi: Readable<TokenUiOrGroupUi[]> = derived(
	[enabledNetworkTokenUiOrGroupUi, tokensToPin, tokensSortType],
	([$tokens, $tokensToPin, $tokensSortType]) =>
		sortTokensUi({
			$tokens,
			$tokensToPin,
			primarySortStrategy: $tokensSortType
		})
);
