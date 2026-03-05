import { approve } from '$icp/api/icrc-ledger.api';
import type { IcFeeResult } from '$icp/types/pay';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { getIcPaymentUri } from '$icp/utils/ic-open-crypto-pay.utils';
import { getTokenFee } from '$icp/utils/token.utils';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type { PayableToken, PayParams, ValidatedIcPaymentData } from '$lib/types/open-crypto-pay';
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

/**
 * Executes IC payment using the ICRC-2 approve flow:
 * 1. Calls `icrc2_approve` on the token ledger, approving the payment provider for amount + transfer fee
 * 2. Sends the user's Principal ID to the OCP API so the provider can call `icrc2_transfer_from`
 */
export const payIcp = async ({
	token,
	identity,
	validatedData,
	progress,
	quoteId,
	callback
}: Omit<PayParams, 'data' | 'amount'> & {
	validatedData: ValidatedIcPaymentData;
}) => {
	const { spender, amount, ledgerCanisterId, fee } = validatedData;

	const approveAmount = amount + fee.feePerTransaction;

	const APPROVE_EXPIRATION_MINUTES = 5n;

	await approve({
		identity,
		ledgerCanisterId,
		amount: approveAmount,
		spender: { owner: spender },
		expiresAt: nowInBigIntNanoSeconds() + APPROVE_EXPIRATION_MINUTES * NANO_SECONDS_IN_MINUTE
	});

	progress(ProgressStepsPayment.PAY);

	const sender = identity.getPrincipal().toText();

	const apiUrl = getIcPaymentUri({
		callback,
		quoteId,
		network: token.network.pay.openCryptoPay,
		asset: token.symbol,
		sender
	});

	await fetchOpenCryptoPay(apiUrl);
};
