import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi, TokenWithBalance } from '$lib/types/token';
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
	const tokensWithBalance: TokenWithBalance[] = $tokens.map((token) => ({
		...token,
		balance: Number(
			formatToken({
				value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0),
				unitName: token.decimals,
				displayDecimals: token.decimals
			})
		)
	}));

	const [positiveBalances, nonPositiveBalances] = tokensWithBalance.reduce<
		[TokenWithBalance[], TokenWithBalance[]]
	>(
		(acc, token) => (
			(token.usdBalance ?? 0) > 0 || token.balance > 0 ? acc[0].push(token) : acc[1].push(token),
			acc
		),
		[[], []]
	);

	return [
		...positiveBalances.sort(
			(a, b) =>
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				b.balance - a.balance ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		),
		...nonPositiveBalances
	].map(({ balance: _, ...rest }) => rest);
};
