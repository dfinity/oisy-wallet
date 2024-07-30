import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const pinTokensAtTop = ({
	$tokens,
	$tokensToPin
}: {
	$tokens: Token[];
	$tokensToPin: TokenToPin[];
}): Token[] => {
	const pinnedTokens = $tokensToPin
		.map(({ id: pinnedId, network: { id: pinnedNetworkId } }) =>
			$tokens.find(
				({ id, network: { id: networkId } }) => id === pinnedId && networkId === pinnedNetworkId
			)
		)
		.filter(nonNullish);

	const otherTokens = $tokens.filter(
		(token) =>
			!pinnedTokens.some(
				({ id, network: { id: networkId } }) => id === token.id && networkId === token.network.id
			)
	);

	return [...pinnedTokens, ...otherTokens];
};

export const sortTokens = ({
	$tokens,
	$exchanges
}: {
	$tokens: Token[];
	$exchanges: ExchangesData;
}) =>
	$tokens.sort(
		(a, b) =>
			($exchanges[b.id]?.usd_market_cap ?? 0) - ($exchanges[a.id]?.usd_market_cap ?? 0) ||
			a.name.localeCompare(b.name) ||
			a.network.name.localeCompare(b.network.name)
	);
