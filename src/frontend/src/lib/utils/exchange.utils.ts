import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
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
	Number(
		formatToken({
			value: balance ?? ZERO,
			unitName: decimals,
			displayDecimals: decimals
		})
	) * exchangeRate;
