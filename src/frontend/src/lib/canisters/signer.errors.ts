import type {
	BtcSignPrehashError,
	EthAddressError,
	PaymentError,
	GetAddressError as SignerCanisterBtcError,
	SendBtcError as SignerCanisterSendBtcError
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { jsonReplacer } from '@dfinity/utils';

const mapPaymentErrorToMessage = (err: PaymentError): string => {
	if ('UnsupportedPaymentType' in err) {
		return 'Unsupported payment type';
	}
	if ('LedgerWithdrawFromError' in err) {
		return `Ledger error: ${JSON.stringify(err.LedgerWithdrawFromError.error, jsonReplacer)}`;
	}
	if ('LedgerUnreachable' in err) {
		return `Ledger unreachable: ${JSON.stringify(err.LedgerUnreachable, jsonReplacer)}`;
	}
	if ('LedgerTransferFromError' in err) {
		return `Ledger error: ${JSON.stringify(err.LedgerTransferFromError, jsonReplacer)}`;
	}
	if ('InsufficientFunds' in err) {
		return `Insufficient funds needed ${err.InsufficientFunds.needed} but available ${err.InsufficientFunds.available}`;
	}
	return 'Unknown PaymentError';
};

// Keeps the variant, so a flow can tell why the signer refused to be paid.
export class SignerCanisterPaymentError extends CanisterInternalError {
	constructor(readonly paymentError: PaymentError) {
		super(mapPaymentErrorToMessage(paymentError));
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

export const mapSignerCanisterBtcSignPrehashError = (
	err: BtcSignPrehashError
): CanisterInternalError => {
	if ('InvalidHash' in err) {
		return new CanisterInternalError(err.InvalidHash.msg);
	}
	if ('SigningError' in err) {
		return new CanisterInternalError(`Signing error: ${err.SigningError}`);
	}
	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}
	return new CanisterInternalError('Unknown BtcSignPrehashError');
};

export const mapSignerCanisterGetEthAddressError = (
	err: EthAddressError
): CanisterInternalError => {
	if ('SigningError' in err) {
		return new CanisterInternalError(`Signing error: ${err.SigningError}`);
	}

	if ('PaymentError' in err) {
		return new SignerCanisterPaymentError(err.PaymentError);
	}

	return new CanisterInternalError('Unknown GenericSigningError');
};
