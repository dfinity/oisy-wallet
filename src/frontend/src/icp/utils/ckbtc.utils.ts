import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import { formatToken } from '$lib/utils/format.utils';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const assertCkBTCUserInputAmount = ({
	amount,
	minterInfo,
	tokenDecimals
}: {
	amount: BigNumber;
	minterInfo: CkBtcMinterInfoData | undefined | null;
	tokenDecimals: number;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount.isZero()) {
		return undefined;
	}

	if (isNullish(minterInfo)) {
		return new IcAmountAssertionError(
			'The minimum amount of ckBTC required for converting to BTC is unknown.'
		);
	}

	const {
		data: { retrieve_btc_min_amount: retrieveBtcMinAmount },
		certified: infoCertified
	} = minterInfo;

	if ((amount?.toBigInt() ?? 0n) < retrieveBtcMinAmount) {
		return new IcAmountAssertionError(
			`The amount falls below the minimum of ${formatToken({
				value: BigNumber.from(retrieveBtcMinAmount),
				unitName: tokenDecimals
			})} ckBTC required for converting to BTC.`
		);
	}

	if (!infoCertified) {
		return new IcAmountAssertionError(
			'Please wait until the ckBTC parameters have been certified.'
		);
	}

	return undefined;
};
