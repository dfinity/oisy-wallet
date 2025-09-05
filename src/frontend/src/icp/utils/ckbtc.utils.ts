import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import { ZERO } from '$lib/constants/app.constants';
import type { Option } from '$lib/types/utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';

export const assertCkBTCUserInputAmount = ({
	amount,
	minterInfo,
	tokenDecimals,
	i18n
}: {
	amount: bigint;
	minterInfo: Option<CkBtcMinterInfoData>;
	tokenDecimals: number;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount === ZERO) {
		return undefined;
	}

	if (isNullish(minterInfo)) {
		return new IcAmountAssertionError(i18n.send.assertion.unknown_minimum_ckbtc_amount);
	}

	const {
		data: { retrieve_btc_min_amount: retrieveBtcMinAmount },
		certified: infoCertified
	} = minterInfo;

	if ((amount ?? ZERO) < retrieveBtcMinAmount) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_ckbtc_amount, {
				$amount: formatToken({
					value: retrieveBtcMinAmount,
					unitName: tokenDecimals
				})
			})
		);
	}

	if (!infoCertified) {
		return new IcAmountAssertionError(i18n.send.info.ckbtc_certified);
	}

	return undefined;
};
