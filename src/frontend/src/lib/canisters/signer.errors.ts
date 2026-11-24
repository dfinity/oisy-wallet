import type {
	BtcSignPrehashError,
	EthAddressError,
	PaymentError,
	GetAddressError as SignerCanisterBtcError,
	SendBtcError as SignerCanisterSendBtcError
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

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

const isPaymentErrorVariant = (err: unknown): err is { PaymentError: PaymentError } =>
	typeof err === 'object' && nonNullish(err) && 'PaymentError' in err;

// `getSchnorrPublicKey` and `signWithSchnorr` throw the canister's error variant as it is; the other
// calls throw a `SignerCanisterPaymentError`.
const paymentErrorOf = (err: unknown): PaymentError | undefined => {
	if (err instanceof SignerCanisterPaymentError) {
		return err.paymentError;
	}

	return isPaymentErrorVariant(err) ? err.PaymentError : undefined;
};

const statedAllowanceOf = (err: unknown): bigint | undefined => {
	const paymentError = paymentErrorOf(err);

	if (isNullish(paymentError) || !('LedgerWithdrawFromError' in paymentError)) {
		return undefined;
	}

	const { error } = paymentError.LedgerWithdrawFromError;

	return 'InsufficientAllowance' in error ? error.InsufficientAllowance.allowance : undefined;
};

// The OISY allowance stated by a charged call (CC) that failed with an insufficient allowance, or
// `undefined` for any other error. A flow may wrap the CC's error and keep it as the `cause`, as a
// Liquidium SOL transfer that was never sent does, so the chain of causes is followed.
export const insufficientAllowanceOf = (err: unknown): bigint | undefined => {
	const seen = new Set<unknown>();
	let current = err;

	while (nonNullish(current) && !seen.has(current)) {
		const allowance = statedAllowanceOf(current);

		if (nonNullish(allowance)) {
			return allowance;
		}

		seen.add(current);
		current = current instanceof Error ? current.cause : undefined;
	}

	return undefined;
};

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
