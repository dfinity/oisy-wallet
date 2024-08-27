import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import { pointerEventStore } from '$lib/stores/events.store';
import { tokensKeysStore } from '$lib/stores/tokens-to-display.store';
import type { TokenUi } from '$lib/types/token';
import { parseTokenKey } from '$lib/utils/tokens-to-display.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const combinedDerivedTokensToDisplay: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedNetworkTokensUi, pointerEventStore, tokensKeysStore],
	([$sortedTokens, $pointerEventStore, $tokensKeys]) => {
		const sortedTokensKeys: string[] = $sortedTokens.map((token) => parseTokenKey(token));

		if (!$pointerEventStore) {
			// No pointer events, so we are not worried about possible glitches on user's interaction.
			tokensKeysStore.set(sortedTokensKeys);
			return $sortedTokens;
		}

		// If there are pointer events, we need to avoid visually re-sorting the tokens, to prevent glitches on user's interaction.

		if ($tokensKeys.join(',') === sortedTokensKeys.join(',')) {
			// The order is the same, so there will be no re-sorting and no possible glitches on user's interaction.
			// However, we need to update the tokensToDisplay to make sure the balances are up-to-date.
			return $sortedTokens;
		}

		// The order is not the same, so the list is kept the same as the one currently showed, but the balances are updated.
		const tokenMap: Map<string, TokenUi> = new Map(
			$sortedTokens.map((token) => [parseTokenKey(token), token])
		);

		return $tokensKeys.map((tokenKey) => tokenMap.get(tokenKey) ?? undefined).filter(nonNullish);
	}
);
