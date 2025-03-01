import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { ConvertAmountErrorType } from '$lib/types/convert';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

// TODO: standardise and re-use this util between Send and Convert flows
export const validateConvertAmount = ({
	userAmount,
	token,
	balance,
	fee,
	ethBalance
}: {
	userAmount: BigNumber;
	token: Token;
	balance?: BigNumber;
	ethBalance?: BigNumber;
	fee?: bigint;
}): ConvertAmountErrorType => {
	// We should align balance and userAmount to avoid issues caused by comparing formatted and unformatted BN
	const parsedSendBalance = nonNullish(balance)
		? Utils.parseUnits(
				formatToken({
					value: balance,
					unitName: token.decimals,
					displayDecimals: token.decimals
				}),
				token.decimals
			)
		: ZERO;

	// Balance should cover the entered amount for all type of tokens
	if (userAmount.gt(parsedSendBalance)) {
		return 'insufficient-funds';
	}

	// If ERC20, the ETH balance should be less or greater than the total (max gas) fee
	if (isTokenErc20(token)) {
		if (nonNullish(ethBalance) && nonNullish(fee) && ethBalance.lt(fee)) {
			return 'insufficient-funds-for-fee';
		}

		return;
	}

	// If other tokens, the balance should cover the user entered amount plus total fee
	if (nonNullish(fee) && userAmount.add(fee).gt(parsedSendBalance)) {
		return 'insufficient-funds-for-fee';
	}
};
