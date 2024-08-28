import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';

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
		formatToken({
			value: balances?.[id]?.data ?? ZERO,
			unitName: decimals,
			displayDecimals: decimals
		})
	) * (exchanges?.[id]?.usd ?? 0);
