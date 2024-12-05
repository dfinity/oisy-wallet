import { ZERO } from '$lib/constants/app.constants';
import type { ConvertAmountErrorType } from '$lib/types/convert';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

// TODO: standardise and re-use this util between Send and Convert flows
export const validateConvertAmount = ({
	userAmount,
	decimals,
	balance,
	totalFee
}: {
	userAmount: BigNumber;
	decimals: number;
	balance?: BigNumber;
	totalFee?: bigint;
}): ConvertAmountErrorType => {
	// We should align balance and userAmount to avoid issues caused by comparing formatted and unformatted BN
	const parsedSendBalance = nonNullish(balance)
		? Utils.parseUnits(
				formatToken({
					value: balance,
					unitName: decimals,
					displayDecimals: decimals
				}),
				decimals
			)
		: ZERO;

	if (userAmount.gt(parsedSendBalance)) {
		return 'insufficient-funds';
	}

	if (nonNullish(totalFee) && userAmount.add(totalFee).gt(parsedSendBalance)) {
		return 'insufficient-funds-for-fee';
	}
};
