import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import { calculateTokenUsdBalance } from '$lib/utils/token.utils';
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

			const usdBalance: number | undefined = calculateTokenUsdBalance({
				token,
				$balances,
				$exchanges
			});

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
 * Calculates total USD balance of the provided UI tokens list.
 *
 * @param tokens - The list of UI tokens for total USD balance calculation.
 * @returns The sum of UI tokens USD balance.
 */
export const sumTokensUiUsdBalance = (tokens: TokenUi[]): number =>
	tokens.reduce((acc, token) => acc + (token.usdBalance ?? 0), 0);

/**
 * Calculates total USD balance of mainnet tokens per network from the provided tokens list.
 *
 * @param $tokens - The list of tokens for filtering by network env and total USD balance calculation.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns A NetworkId-number dictionary with total USD balance of mainnet tokens per network.
 *
 */
export const sumMainnetTokensUsdBalancesPerNetwork = ({
	$tokens,
	$balances,
	$exchanges
}: {
	$tokens: Token[];
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokensTotalUsdBalancePerNetwork =>
	nonNullish($exchanges) && nonNullish($balances)
		? $tokens.reduce<TokensTotalUsdBalancePerNetwork>(
				(acc, token) =>
					token.network.env === 'mainnet'
						? {
								...acc,
								[token.network.id]:
									(acc[token.network.id] ?? 0) +
									(calculateTokenUsdBalance({ token, $balances, $exchanges }) ?? 0)
							}
						: acc,
				{}
			)
		: {};

/**
 * Filters and returns a list of "enabled" by user tokens
 *
 * @param $tokens - The list of tokens.
 * @returns The list of "enabled" tokens.
 */
export const filterEnabledTokens = ([$tokens]: [$tokens: Token[]]): Token[] =>
	$tokens.filter((token) => ('enabled' in token ? token.enabled : true));
