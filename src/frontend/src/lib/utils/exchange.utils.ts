import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';

export const usdValue = ({
	token: { id, decimals },
	balance,
	exchanges
}: {
	token: Token;
	balance: BigNumber;
	exchanges: ExchangesData;
}): number =>
	Number(
		formatToken({
			value: balance,
			unitName: decimals,
			displayDecimals: decimals
		})
	) * (exchanges?.[id]?.usd ?? 0);
