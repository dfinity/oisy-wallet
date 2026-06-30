import type {
	EthAddressError,
	PaymentError,
	GetAddressError as SignerCanisterBtcError,
	SendBtcError as SignerCanisterSendBtcError
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { jsonReplacer } from '@dfinity/utils';

export class SignerCanisterPaymentError extends CanisterInternalError {
	constructor(err: PaymentError) {
		if ('UnsupportedPaymentType' in err) {
			super('Unsupported payment type');
		} else if ('LedgerWithdrawFromError' in err) {
			super(`Ledger error: ${JSON.stringify(err.LedgerWithdrawFromError.error, jsonReplacer)}`);
		} else if ('LedgerUnreachable' in err) {
			super(`Ledger unreachable: ${JSON.stringify(err.LedgerUnreachable, jsonReplacer)}`);
		} else if ('LedgerTransferFromError' in err) {
			super(`Ledger error: ${JSON.stringify(err.LedgerTransferFromError, jsonReplacer)}`);
		} else if ('InsufficientFunds' in err) {
			super(
				`Insufficient funds needed ${err.InsufficientFunds.needed} but available ${err.InsufficientFunds.available}`
			);
		} else {
			super('Unknown PaymentError');
		}
	}
}

// A `SignerCanisterPaymentError` means OISY's backend cannot pay the chain-fusion
// signer for the call (e.g. it is out of cycles on the cycles ledger) — every
// `PaymentError` variant maps to "signer temporarily unavailable", not a user error.
export const isSignerCanisterPaymentError = (err: unknown): boolean =>
	err instanceof SignerCanisterPaymentError;

export const mapSignerCanisterBtcError = (err: SignerCanisterBtcError): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}
	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}
	return new CanisterInternalError('Unknown SignerCanisterBtcError');
};

export const mapSignerCanisterSendBtcError = (
	err: SignerCanisterSendBtcError
): CanisterInternalError => {
	if ('InternalError' in err) {
		return new CanisterInternalError(err.InternalError.msg);
	}
	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}
	if ('BuildP2wpkhError' in err) {
		return new CanisterInternalError(JSON.stringify(err.BuildP2wpkhError, jsonReplacer));
	}
	return new CanisterInternalError('Unknown SignerCanisterSendBtcError');
};

export const mapSignerCanisterGetEthAddressError = (
	err: EthAddressError
): CanisterInternalError => {
	if ('SigningError' in err) {
		const [code, addOns] = err.SigningError;
		return new CanisterInternalError(
			`Signing error: ${JSON.stringify(code, jsonReplacer)} ${addOns}`
		);
	}

	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}

	return new CanisterInternalError('Unknown GenericSigningError');
};
