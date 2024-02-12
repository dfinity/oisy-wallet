import { CKETH_MIN_WITHDRAWAL_AMOUNT } from '$icp/constants/cketh.constants';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import { formatToken } from '$lib/utils/format.utils';
import { BigNumber } from '@ethersproject/bignumber';

export const assertCkETHUserInputAmount = ({
	amount,
	tokenDecimals,
	tokenSymbol
}: {
	amount: BigNumber;
	tokenDecimals: number;
	tokenSymbol: string;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount.isZero()) {
		return undefined;
	}

	if ((amount?.toBigInt() ?? 0n) < CKETH_MIN_WITHDRAWAL_AMOUNT) {
		return new IcAmountAssertionError(
			`The amount falls below the minimum withdrawal amount of ${formatToken({
				value: BigNumber.from(CKETH_MIN_WITHDRAWAL_AMOUNT),
				unitName: tokenDecimals,
				displayDecimals: tokenDecimals
			})} ${tokenSymbol}.`
		);
	}

	return undefined;
};
