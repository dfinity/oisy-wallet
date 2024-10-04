import type { GetAddressError, PaymentError } from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export class SignerCanisterPaymentError extends Error {
	constructor(response: PaymentError) {
		if ('UnsupportedPaymentType' in response) {
			super('Unsupported payment type');
		} else if ('LedgerWithdrawFromError' in response) {
			super(`Ledger error: ${JSON.stringify(response.LedgerWithdrawFromError.error)}`);
		} else if ('LedgerUnreachable' in response) {
			super(`Ledger unreachable: ${JSON.stringify(response.LedgerUnreachable)}`);
		} else if ('LedgerTransferFromError' in response) {
			super(`Ledger error: ${JSON.stringify(response.LedgerTransferFromError)}`);
		} else if ('InsufficientFunds' in response) {
			super(
				`Insufficient funds needed ${response.InsufficientFunds.needed} but available ${response.InsufficientFunds.available}`
			);
		} else {
			super('Unknown PaymentError');
		}
	}
}

type SignerCanisterBtcError = GetAddressError;
export const mapSignerCanisterBtcError = (response: SignerCanisterBtcError) => {
	if ('InternalError' in response) {
		return new CanisterInternalError(response.InternalError.msg);
	}
	if ('PaymentError' in response) {
		return new SignerCanisterPaymentError(response.PaymentError);
	}
	return new CanisterInternalError('Unknown SignerCanisterBtcError');
};
