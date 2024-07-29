import { type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

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
 * @param $exchanges - The exchange rates for the tokens.
 * @param $balancesStore - The balances for the tokens.
 * @returns The sorted list of tokens.
 *
 */
export const pinTokensWithBalanceAtTop = ({
	$tokens,
	$balancesStore
}: {
	$tokens: TokenUi[];
	$balancesStore: CertifiedStoreData<BalancesData>;
}): TokenUi[] => {
	const tokensWithBalanceToPin: TokenToPin[] = $tokens
		.reduce(
			(acc, token) => {
				const balance = Number(
					formatToken({
						value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0),
						unitName: token.decimals,
						displayDecimals: token.decimals
					})
				);

				const usdBalance = token.usdBalance ?? 0;

				if (usdBalance > 0 || balance > 0) {
					return [...acc, { ...token, balance }];
				}

				return acc;
			},
			[] as (TokenUi & { balance: number })[]
		)
		.sort(
			(a, b) =>
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				b.balance - a.balance ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		);

	return pinTokensAtTop({
		$tokens,
		$tokensToPin: tokensWithBalanceToPin
	});
};
