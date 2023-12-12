import type { BalancesData } from '$lib/stores/balances.store';
import type { ExchangeData } from '$lib/stores/exchange.store';
import type { Token } from '$lib/types/token';
import { formatTokenDetailed } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';

export const usdValue = ({
	token: { id, decimals },
	balances,
	exchanges
}: {
	token: Token;
	balances: BalancesData;
	exchanges: ExchangeData;
}): number =>
	Number(formatTokenDetailed({ value: balances?.[id] ?? BigNumber.from(0), unitName: decimals })) *
	(exchanges?.[id]?.usd ?? 0);
