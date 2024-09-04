import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

/**
 * Sorts tokens by market cap, name and network name, pinning the specified ones at the top of the list in the order they are provided.
 *
 * @param $tokens - The list of tokens to sort.
 * @param $tokensToPin - The list of tokens to pin at the top of the list.
 * @param $exchanges - The exchange rates for the tokens.
 */
export const sortTokens = ({
	$tokens,
	$exchanges,
	$tokensToPin
}: {
	$tokens: Token[];
	$exchanges: ExchangesData;
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

	return [
		...pinnedTokens,
		...otherTokens.sort(
			(a, b) =>
				($exchanges[b.id]?.usd_market_cap ?? 0) - ($exchanges[a.id]?.usd_market_cap ?? 0) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		)
	];
};

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
			(token.usdBalance ?? 0) > 0 || (token.balance ?? ZERO).gt(0)
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
				+(b.balance ?? ZERO).gt(a.balance ?? ZERO) - +(b.balance ?? ZERO).lt(a.balance ?? ZERO) ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		),
		...nonPositiveBalances
	];
};

/**
 * Calculates total USD balance of the provided tokens list.
 *
 * @param tokens - The list of tokens for total USD balance calculation.
 * @returns The sum of tokens USD balance.
 */
export const sumTokensUsdBalance = (tokens: TokenUi[]): number =>
	tokens.reduce((acc, token) => acc + (token.usdBalance ?? 0), 0);
