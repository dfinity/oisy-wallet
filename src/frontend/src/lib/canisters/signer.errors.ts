import type { GetAddressError, PaymentError } from '$declarations/signer/signer.did';

export class SignerCanisterPaymentError extends Error {
	constructor(response: PaymentError) {
		if ('LedgerUnreachable' in response) {
			super(`Ledger unreachable ${response.LedgerUnreachable.ledger}`);
		} else if ('UnsupportedPaymentType' in response) {
			super('Unsupported payment type');
		} else if ('LedgerError' in response) {
			super(`Ledger error: ${JSON.stringify(response.LedgerError.error)}`);
		} else if ('InsufficientFunds' in response) {
			super(
				`Insufficient funds needed ${response.InsufficientFunds.needed} but available ${response.InsufficientFunds.available}`
			);
		} else {
			super('Unknown PaymentError');
		}
	}
}

export class SignerCanisterInternalError extends Error {
	constructor(msg: string) {
		super(msg);
	}
}

export const signerCanisterError = (response: GetAddressError) => {
	if ('InternalError' in response) {
		return new SignerCanisterInternalError(response.InternalError.msg);
	}
	if ('PaymentError' in response) {
		return new SignerCanisterPaymentError(response.PaymentError);
	}
	return new Error('Unknown GetAddressError');
};
