import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import { formatTokenShort } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';

export const usdValue = ({
	token: { id, decimals },
	balances,
	exchanges
}: {
	token: Token;
	balances: CertifiedStoreData<BalancesData>;
	exchanges: ExchangesData;
}): number =>
	Number(
		formatTokenShort({
			value: balances?.[id]?.data ?? BigNumber.from(0),
			unitName: decimals,
			displayDecimals: decimals
		})
	) * (exchanges?.[id]?.usd ?? 0);
