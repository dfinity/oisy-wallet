import type {
	EthAddressError,
	PaymentError,
	GetAddressError as SignerCanisterBtcError,
	SendBtcError as SignerCanisterSendBtcError
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { jsonReplacer } from '@dfinity/utils';

// An exhausted ICRC-2 spender allowance surfaces nested inside the ledger transfer/withdraw
// error. Unlike insufficient funds (a wallet-wide backend outage), this is a per-user signing
// limit, so it warrants a distinct user message.
const isInsufficientAllowancePaymentError = (err: PaymentError): boolean =>
	('LedgerWithdrawFromError' in err &&
		'InsufficientAllowance' in err.LedgerWithdrawFromError.error) ||
	('LedgerTransferFromError' in err &&
		'InsufficientAllowance' in err.LedgerTransferFromError.error);

export class SignerCanisterPaymentError extends CanisterInternalError {
	// `true` when the payment failed because the caller's ICRC-2 allowance is exhausted
	// (a per-user signing limit) rather than the backend being unable to pay at all.
	readonly insufficientAllowance: boolean;

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

		this.insufficientAllowance = isInsufficientAllowancePaymentError(err);
	}
}

// A `SignerCanisterPaymentError` means the chain-fusion signer could not be paid for the call.
// Most variants (e.g. the backend being out of cycles) are a wallet-wide outage; the allowance
// case (see `isSignerCanisterAllowanceError`) is the per-user exception.
export const isSignerCanisterPaymentError = (err: unknown): boolean =>
	err instanceof SignerCanisterPaymentError;

// A per-user signing limit: the caller's ICRC-2 allowance towards the signer is exhausted.
// Funds may be available — this is not the wallet-wide cycles outage.
export const isSignerCanisterAllowanceError = (err: unknown): boolean =>
	err instanceof SignerCanisterPaymentError && err.insufficientAllowance;

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
