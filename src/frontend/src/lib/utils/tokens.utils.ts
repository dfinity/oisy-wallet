import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';

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
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The sorted list of tokens.
 *
 */
export const pinTokensWithBalanceAtTop = ({
	$tokens,
	$balances,
	$exchanges
}: {
	$tokens: Token[];
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokenUi[] => {
	const [positiveBalances, nonPositiveBalances] = $tokens.reduce<[TokenUi[], TokenUi[]]>(
		(acc, token) => {
			const balance: BigNumber | undefined = $balances?.[token.id]?.data;
			const exchangeRate: number | undefined = $exchanges?.[token.id]?.usd;

			const usdBalance: number | undefined = nonNullish(exchangeRate)
				? usdValue({
						token,
						balance,
						exchangeRate
					})
				: undefined;

			const tokenUI: TokenUi = {
				...token,
				balance,
				usdBalance
			};

			if ((usdBalance ?? 0) > 0 || (balance ?? ZERO).gt(0)) {
				acc[0] = [...acc[0], tokenUI];

				return acc;
			}

			acc[1] = [...acc[1], tokenUI];

			return acc;
		},
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
