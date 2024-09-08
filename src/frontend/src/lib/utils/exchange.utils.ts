import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';

export const usdValue = ({
	token: { decimals },
	balance,
	exchangeRate
}: {
	token: Token;
	balance: BigNumber | undefined;
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
