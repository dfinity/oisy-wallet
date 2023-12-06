import type { BalancesData } from '$lib/stores/balances.store';
import type { ExchangeData } from '$lib/stores/exchange.store';
import type { TokenId } from '$lib/types/token';
import { formatTokenDetailed } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';

export const usdValue = ({
	tokenId,
	balances,
	exchanges
}: {
	tokenId: TokenId;
	balances: BalancesData;
	exchanges: ExchangeData;
}): number =>
	Number(formatTokenDetailed({ value: balances?.[tokenId] ?? BigNumber.from(0) })) *
	(exchanges?.[tokenId]?.usd ?? 0);
