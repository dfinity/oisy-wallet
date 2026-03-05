import type { IcFeeResult } from '$icp/types/pay';
import { getTokenFee } from '$icp/utils/token.utils';
import type { PayableToken } from '$lib/types/open-crypto-pay';
import { isNullish } from '@dfinity/utils';

/**
 * Calculates the fee for an ICP/ICRC token payment.
 * The total fee covers two transactions: one for `icrc2_approve` and one for `icrc2_transfer_from`.
 */
export const calculateIcFee = (token: PayableToken): IcFeeResult | undefined => {
	const fee = getTokenFee(token);

	if (isNullish(fee)) {
		return;
	}

	return {
		feePerTransaction: fee,
		totalFee: fee * 2n
	};
};
