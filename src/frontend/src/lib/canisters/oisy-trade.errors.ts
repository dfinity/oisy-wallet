import { CanisterInternalError } from '$lib/canisters/errors';
import { fromNullable, nonNullish } from '@dfinity/utils';

// Every user-facing oisy-trade endpoint fails with the same envelope:
// `{ kind: variant { RequestError | TemporaryError | InternalError }, message }`.
// The `kind` tells the caller whose fault it is and whether a retry can help;
// each inner variant (optional) names the specific reason.
interface OisyTradeCanisterError {
	kind:
		| { RequestError: [] | [unknown] }
		| { TemporaryError: [] | [unknown] }
		| { InternalError: [] | [unknown] };
	message: [] | [string];
}

// Base for all mapped oisy-trade canister errors. `retryable` answers the only
// question a caller has on failure: is it worth submitting the same request
// again? `reason` is the canister's machine discriminant (e.g. 'TradingHalted',
// 'InsufficientBalance') for telemetry / branching.
export class OisyTradeError extends CanisterInternalError {
	readonly retryable: boolean;
	readonly reason: string;

	constructor({
		message,
		reason,
		retryable
	}: {
		message: string;
		reason: string;
		retryable: boolean;
	}) {
		super(message);
		this.retryable = retryable;
		this.reason = reason;
	}
}

// The request itself is at fault (bad input, unknown pair, insufficient balance,
// …) — retrying the same request will fail again; the user must change it.
export class OisyTradeRequestError extends OisyTradeError {
	constructor(args: { message: string; reason: string }) {
		super({ ...args, retryable: false });
	}
}

// A transient condition (trading halted, ledger momentarily unavailable, …) —
// the same request may well succeed on retry.
export class OisyTradeTemporaryError extends OisyTradeError {
	constructor(args: { message: string; reason: string }) {
		super({ ...args, retryable: true });
	}
}

// The canister hit an unexpected internal failure — not the caller's fault, and
// not known to be transient; surface it and don't auto-retry.
export class OisyTradeUnexpectedError extends OisyTradeError {
	constructor(args: { message: string; reason: string }) {
		super({ ...args, retryable: false });
	}
}

// The discriminant of the (optional) inner variant, e.g. 'InsufficientBalance'.
const innerReason = (inner: [] | [unknown]): string | undefined => {
	const variant = fromNullable(inner);
	return nonNullish(variant) && typeof variant === 'object' ? Object.keys(variant)[0] : undefined;
};

// Maps any user-facing oisy-trade endpoint error to a typed, retry-aware error.
// Prefers the canister's human `message`; falls back to the reason discriminant.
export const mapOisyTradeError = ({ kind, message }: OisyTradeCanisterError): OisyTradeError => {
	const text = fromNullable(message);

	if ('TemporaryError' in kind) {
		const reason = innerReason(kind.TemporaryError) ?? 'TemporaryError';
		return new OisyTradeTemporaryError({ message: text ?? reason, reason });
	}

	if ('RequestError' in kind) {
		const reason = innerReason(kind.RequestError) ?? 'RequestError';
		return new OisyTradeRequestError({ message: text ?? reason, reason });
	}

	const reason =
		'InternalError' in kind ? (innerReason(kind.InternalError) ?? 'InternalError') : 'UnknownError';
	return new OisyTradeUnexpectedError({ message: text ?? reason, reason });
};
