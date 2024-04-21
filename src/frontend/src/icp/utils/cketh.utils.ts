import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { fromNullable, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const assertCkETHUserInputAmount = ({
	amount,
	tokenDecimals,
	tokenSymbol,
	minterInfo,
	i18n
}: {
	amount: BigNumber;
	tokenDecimals: number;
	tokenSymbol: string;
	minterInfo: CkEthMinterInfoData | undefined | null;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount.isZero()) {
		return undefined;
	}

	if (isNullish(minterInfo)) {
		return new IcAmountAssertionError(i18n.send.assertion.unknown_minimum_cketh_amount);
	}

	const {
		data: { minimum_withdrawal_amount },
		certified: infoCertified
	} = minterInfo;

	// The `minimum_withdrawal_amount` is optional in the minter info because the team decided to make all fields optional for maintainability reasons. That's why we assume that it is most likely set.
	const minWithdrawalAmount = fromNullable(minimum_withdrawal_amount) ?? 0n;

	if ((amount?.toBigInt() ?? 0n) < minWithdrawalAmount) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_cketh_amount, {
				$amount: formatToken({
					value: BigNumber.from(minWithdrawalAmount),
					unitName: tokenDecimals,
					displayDecimals: tokenDecimals
				}),
				$symbol: tokenSymbol
			})
		);
	}

	if (!infoCertified) {
		return new IcAmountAssertionError(i18n.send.info.cketh_certified);
	}

	return undefined;
};
