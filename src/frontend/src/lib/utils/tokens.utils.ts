import { type BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
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

export const pinTokensWithBalanceAtTop = ({
	$tokens,
	$exchanges,
	$balancesStore
}: {
	$tokens: Token[];
	$exchanges: ExchangesData;
	$balancesStore: CertifiedStoreData<BalancesData>;
}) => {
	const tokensWithBalanceToPin: TokenToPin[] = $tokens
		.map((token) => ({
			...token,
			balance: $exchanges?.[token.id]?.usd
				? usdValue({
						token,
						balances: $balancesStore,
						exchanges: $exchanges
					})
				: Number(
						formatToken({
							value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0),
							unitName: token.decimals,
							displayDecimals: token.decimals
						})
					)
		}))
		.sort(
			(a, b) =>
				b.balance - a.balance ||
				a.name.localeCompare(b.name) ||
				a.network.name.localeCompare(b.network.name)
		)
		.filter((token) => token.balance > 0);
	return pinTokensAtTop({
		$tokens,
		$tokensToPin: tokensWithBalanceToPin
	});
};
