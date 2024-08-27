import { currentTokensKeysStore } from '$lib/stores/tokens-to-display.store';
import type { Token, TokenUi } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

const parseTokenKey = (token: Token): string =>
	`${token.id.description}-${token.network.id.description}`;

export const defineTokensToDisplay = ({
	$sortedTokens,
	$pointerEventStore,
	$currentTokensKeys
}: {
	$sortedTokens: TokenUi[];
	$pointerEventStore: boolean;
	$currentTokensKeys: string[];
}): TokenUi[] => {
	const sortedTokensKeys: string[] = $sortedTokens.map((token) => parseTokenKey(token));

	if (!$pointerEventStore) {
		// No pointer events, so we are not worried about possible glitches on user's interaction.
		currentTokensKeysStore.set(sortedTokensKeys);
		return $sortedTokens;
	}

	// If there are pointer events, we need to avoid visually re-sorting the tokens, to prevent glitches on user's interaction.

	if ($currentTokensKeys.join(',') === sortedTokensKeys.join(',')) {
		// The order is the same, so there will be no re-sorting and no possible glitches on user's interaction.
		// However, we need to update the tokensToDisplay to make sure the balances are up-to-date.
		return $sortedTokens;
	}

	// The order is not the same, so the list is kept the same as the one currently showed, but the balances are updated.
	const tokenMap: Map<string, TokenUi> = new Map(
		$sortedTokens.map((token) => [parseTokenKey(token), token])
	);

	// return $tokensKeys.map((tokenKey) => tokenMap.get(tokenKey) ?? undefined).filter(nonNullish);
	return $currentTokensKeys.reduce<TokenUi[]>((acc, tokenKey) => {
		const token = tokenMap.get(tokenKey);
		if (nonNullish(token)) {
			acc.push(token);
		}
		return acc;
	}, []);
};
