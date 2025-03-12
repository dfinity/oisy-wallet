import { ZERO } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';

export const usdValue = ({
	decimals,
	balance,
	exchangeRate
}: {
	decimals: number;
	balance: Exclude<OptionBalance, null>;
	exchangeRate: number;
}): number =>
	nonNullish(balance)
		? Number(
				formatToken({
					value: balance,
					unitName: decimals,
					displayDecimals: decimals
				})
			) * exchangeRate
		: ZERO.toNumber();
