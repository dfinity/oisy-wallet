import type {
	PaymentError,
	GetAddressError as SignerCanisterBtcError
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export class SignerCanisterPaymentError extends CanisterInternalError {
	constructor(err: PaymentError) {
		if ('UnsupportedPaymentType' in err) {
			super('Unsupported payment type');
		} else if ('LedgerWithdrawFromError' in err) {
			super(`Ledger error: ${JSON.stringify(err.LedgerWithdrawFromError.error)}`);
		} else if ('LedgerUnreachable' in err) {
			super(`Ledger unreachable: ${JSON.stringify(err.LedgerUnreachable)}`);
		} else if ('LedgerTransferFromError' in err) {
			super(`Ledger error: ${JSON.stringify(err.LedgerTransferFromError)}`);
		} else if ('InsufficientFunds' in err) {
			super(
				`Insufficient funds needed ${err.InsufficientFunds.needed} but available ${err.InsufficientFunds.available}`
			);
		} else {
			super('Unknown PaymentError');
		}
	}
}

export const mapSignerCanisterBtcError = (err: SignerCanisterBtcError): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}
	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}
	return new CanisterInternalError('Unknown SignerCanisterBtcError');
};
