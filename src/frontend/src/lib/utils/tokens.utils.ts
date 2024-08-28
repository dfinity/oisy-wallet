import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
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

/**
 * Sorts tokens by market cap, name and network name.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $exchanges - The exchange rates for the tokens.
 */
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

/**
 * Pins tokens by USD value, balance and name.
 *
 * The function pins on top of the list the tokens that have a balance and/or an exchange rate.
 * It sorts first the ones that have an exchange rate and balance non-zero, according to their usd value (descending).
 * Then, it sorts the ones that have only a balance non-zero and no exchange rate, according to their balance (descending).
 * Finally, it leaves the rest of the tokens untouched.
 * In case of a tie, it sorts by token name and network name.
 *
 * @param $tokens - The list of tokens to sort.
 * @returns The sorted list of tokens.
 *
 */
export const pinTokensWithBalanceAtTop = ($tokens: TokenUi[]): TokenUi[] => {
	const [positiveBalances, nonPositiveBalances] = $tokens.reduce<[TokenUi[], TokenUi[]]>(
		(acc, token) => (
			(token.usdBalance ?? 0) > 0 || Number(token.formattedBalance ?? 0) > 0
				? acc[0].push(token)
				: acc[1].push(token),
			acc
		),
		[[], []]
	);

	return [
		...positiveBalances.sort(
			(a, b) =>
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				Number(b.formattedBalance ?? 0) - Number(a.formattedBalance ?? 0) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		),
		...nonPositiveBalances
	];
};
