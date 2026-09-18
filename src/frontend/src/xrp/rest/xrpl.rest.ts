import { ZERO } from '$lib/constants/app.constants';
import { XRP_RPC_TIMEOUT_MS } from '$xrp/constants/xrp.constants';
import { xrpHttpRpcUrl } from '$xrp/providers/xrp-rpc.providers';
import {
	XrplAccountInfoFullResultSchema,
	XrplAccountInfoResultSchema,
	XrplEnvelopeSchema,
	XrplFeeResultSchema,
	XrplLedgerCurrentResultSchema,
	XrplLedgerResultSchema,
	XrplSubmitResultSchema,
	XrplTxResultSchema
} from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type {
	XrpAccountInfo,
	XrpSubmitResult,
	XrpTransactionOutcome
} from '$xrp/types/xrp-transaction';
import { nonNullish } from '@dfinity/utils';

/**
 * An XRPL method answered with `result.error`.
 *
 * Carries the code so a caller can act on a specific one without matching message text. Codes a
 * helper treats as an expected state are named in its `expectedErrors` and returned to it instead
 * of throwing.
 */
export class XrplRpcError extends Error {
	readonly error: string;

	constructor({ method, error }: { method: string; error: string }) {
		super(`Unexpected XRPL ${method} response: ${error}`);
		this.error = error;
	}
}

/**
 * One place that owns the JSON-RPC envelope.
 *
 * XRPL answers a failed request with HTTP 200 and the failure in the body, so `result.error` has
 * to be inspected on every call. Doing that here rather than in each helper means the envelope is
 * actually validated — a body without `result` used to reach the helpers as `undefined` and give a
 * `TypeError` from `result.error`, not the intended message — and each helper is left to decide
 * only which errors are an expected state for it.
 */
const xrpJsonRpc = async ({
	network,
	method,
	params,
	expectedErrors = []
}: {
	network: XrpNetworkType;
	method: string;
	params: Record<string, unknown>;
	expectedErrors?: string[];
}): Promise<Record<string, unknown>> => {
	const response = await fetch(xrpHttpRpcUrl(network), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method, params: [params] }),
		// Without this a stalled connection never settles, and every caller that treats a failed
		// lookup as one lost attempt waits forever instead.
		signal: AbortSignal.timeout(XRP_RPC_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`XRPL ${method} request failed with status ${response.status}`);
	}

	const body: unknown = await response.json();
	const parsed = XrplEnvelopeSchema.safeParse(body);

	if (!parsed.success) {
		// A top-level `error` is the node reporting on the call itself rather than on the ledger, so
		// it is surfaced as the code it is — and routed through the same `expectedErrors` check as an
		// error inside `result`, which no caller declares, so it always throws. Reporting it as a
		// missing result would name the wrong problem, and for a body that carries both an error and
		// a result it would be plainly false.
		const topLevelError = (body as { error?: unknown } | null)?.error;

		if (typeof topLevelError === 'string') {
			throw new XrplRpcError({ method, error: topLevelError });
		}

		throw new Error(`Unexpected XRPL ${method} response: no result object`);
	}

	const { result } = parsed.data;
	const { error } = result;

	// A present `error` must be a string. `String(error)` let a malformed value coerce into an
	// expected code — `['txnNotFound']` matching `'txnNotFound'` — and `nonNullish` read a present
	// `null` as no error at all, which is how `loadXrpOpenLedgerFee` came to answer a failed
	// response with its fallback base fee: the underpricing that check exists to prevent.
	if ('error' in result && typeof error !== 'string') {
		throw new XrplRpcError({ method, error: String(error) });
	}

	// Compared raw, so only the code the node actually sent can be an expected state.
	if (typeof error === 'string' && !expectedErrors.includes(error)) {
		throw new XrplRpcError({ method, error });
	}

	return result;
};

/**
 * Native XRP balance in drops (1 XRP = 1,000,000 drops), via the XRP Ledger
 * JSON-RPC `account_info` method.
 *
 * An account that has never been funded does not exist on-ledger and the node
 * answers with the `actNotFound` error; that is a valid zero balance, not a
 * failure, so it maps to {@link ZERO}.
 */
export const loadXrpBalance = async ({
	address,
	network
}: {
	address: XrpAddress;
	network: XrpNetworkType;
}): Promise<XrpBalance> => {
	const result = await xrpJsonRpc({
		network,
		method: 'account_info',
		params: { account: address, ledger_index: 'validated' },
		expectedErrors: ['actNotFound']
	});

	// The response is untrusted external JSON: validate it before converting, so a malformed
	// `Balance` cannot pass through `BigInt` as a plausible-looking amount.
	const parsed = XrplAccountInfoResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL account_info response: it does not match the expected shape');
	}

	const { data } = parsed;

	return 'error' in data ? ZERO : BigInt(data.account_data.Balance);
};

/**
 * The account is not on-ledger. Distinct from an operational failure: it means the account owns
 * nothing, so the base reserve alone genuinely describes its requirement.
 */
export class XrpAccountNotFoundError extends Error {}

/**
 * Account balance (drops), current `Sequence` and `OwnerCount` for a funded account.
 * Unlike {@link loadXrpBalance}, this throws for an unfunded account (`actNotFound`): you
 * cannot build a valid transaction without a sequence number.
 *
 * `OwnerCount` is needed for the reserve: every ledger object the account owns raises the
 * amount it must retain beyond the base reserve.
 */
export const loadXrpAccountInfo = async ({
	address,
	network
}: {
	address: XrpAddress;
	network: XrpNetworkType;
}): Promise<XrpAccountInfo> => {
	const result = await xrpJsonRpc({
		network,
		method: 'account_info',
		params: { account: address, ledger_index: 'validated' },
		expectedErrors: ['actNotFound']
	});

	// Untrusted external JSON: `Balance` must be an unsigned decimal string and the counters
	// non-negative safe integers. A negative `OwnerCount` would lower the reserve and inflate the
	// sendable maximum; a fractional one throws inside `BigInt()` with an opaque RangeError.
	//
	// Parsed BEFORE absence is concluded. The schema's two variants are mutually exclusive, so a
	// response carrying both `actNotFound` and `account_data` matches neither and stays a malformed
	// response — rather than being read as absence, which discards the `Flags` the send path needs
	// and lets an untagged payment through to `tecDST_TAG_NEEDED`.
	const parsed = XrplAccountInfoFullResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL account_info response: it does not match the expected shape');
	}

	const { data } = parsed;

	// The account is not on-ledger: a typed error, because owning nothing is a legitimate answer
	// the destination check reads, not an operational failure.
	if ('error' in data) {
		throw new XrpAccountNotFoundError(`XRPL account not found: ${address}`);
	}

	const { Balance, Sequence, OwnerCount, Flags } = data.account_data;

	return { balance: BigInt(Balance), sequence: Sequence, ownerCount: OwnerCount, flags: Flags };
};

/**
 * Current open-ledger fee in drops via the `fee` method. Falls back to the base fee,
 * and finally to `fallbackFee`, if the node omits the open-ledger estimate.
 */
export const loadXrpOpenLedgerFee = async ({
	network,
	fallbackFee
}: {
	network: XrpNetworkType;
	fallbackFee: XrpBalance;
}): Promise<XrpBalance> => {
	const result = await xrpJsonRpc({ network, method: 'fee', params: {} });

	// No `expectedErrors`: every field of this result is optional, so an error response would parse
	// happily with no `drops` and be answered with the fallback — the base fee, which is exactly
	// what underprices a send on the congested node that returned `tooBusy`. The envelope rejects
	// it first. The fallback is for a successful response that omits the estimate, nothing else.
	const parsed = XrplFeeResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL fee response: it does not match the expected shape');
	}

	const { drops } = parsed.data;
	const fee = drops?.open_ledger_fee ?? drops?.base_fee;

	return nonNullish(fee) ? BigInt(fee) : fallbackFee;
};

/**
 * Index of the ledger currently being built. This is the right base for choosing a
 * `LastLedgerSequence` at signing time, but NOT for deciding that a transaction expired:
 * the open index has already advanced past a closed ledger whose transactions are not yet
 * validated. Use `loadXrpValidatedLedgerIndex` for that.
 */
export const loadXrpLedgerIndex = async ({
	network
}: {
	network: XrpNetworkType;
}): Promise<number> => {
	const result = await xrpJsonRpc({ network, method: 'ledger_current', params: {} });

	const parsed = XrplLedgerCurrentResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL ledger_current response: missing ledger_current_index');
	}

	return parsed.data.ledger_current_index;
};

/**
 * Index of the latest validated ledger. A transaction can only be declared expired once
 * this — not the open index — has passed its `LastLedgerSequence`.
 */
export const loadXrpValidatedLedgerIndex = async ({
	network
}: {
	network: XrpNetworkType;
}): Promise<number> => {
	const result = await xrpJsonRpc({
		network,
		method: 'ledger',
		params: { ledger_index: 'validated' }
	});

	// A malformed HIGH index would declare a still-live payment expired, so this is validated
	// rather than cast, and the response must actually describe a validated ledger.
	const parsed = XrplLedgerResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL ledger response: missing validated ledger_index');
	}

	const { data } = parsed;

	return 'ledger_index' in data ? data.ledger_index : data.ledger.ledger_index;
};

/**
 * The final outcome of a transaction hash, via the `tx` method.
 *
 * `validated` only means the transaction is **final**, not that it succeeded: a
 * fee-claiming `tec*` transaction is validated too. Callers must therefore decide on
 * `transactionResult` (the validated `meta.TransactionResult`), not on `validated` alone.
 */
export const loadXrpTransactionOutcome = async ({
	hash,
	network,
	firstLedgerSequence,
	lastLedgerSequence
}: {
	hash: string;
	network: XrpNetworkType;
	firstLedgerSequence: number;
	lastLedgerSequence: number;
}): Promise<XrpTransactionOutcome> => {
	// The range is what makes a negative answer meaningful. Per the XRPL reference `txnNotFound`
	// means "either the transaction does not exist, or it was part of an ledger version that xrpld
	// does not have available", and so "a txnNotFound on its own is not enough to know the final
	// outcome of a transaction". Supplying `min_ledger`/`max_ledger` makes the node report
	// `searched_all`, which distinguishes the two. The window is the 21 ledgers the transaction can
	// be included in, far inside the 1000-ledger limit that would give `excessiveLgrRange`.
	const result = await xrpJsonRpc({
		network,
		method: 'tx',
		params: {
			transaction: hash,
			min_ledger: firstLedgerSequence,
			max_ledger: lastLedgerSequence
		},
		// Only `txnNotFound` can mean "not there", and the envelope throws on anything else: a node
		// that merely said `tooBusy` must not be read as the transaction being absent, because the
		// caller concludes expiry from a non-validated lookup.
		expectedErrors: ['txnNotFound']
	});

	// Parsed BEFORE anything is concluded, absence included. The schema's three variants — validated,
	// pending, fully-searched absence — are mutually exclusive, so a shape that is none of them
	// cannot be mistaken for one: a malformed or empty result stays indeterminate instead of ending
	// the send. Deciding absence from `result.error` ahead of the parse also meant a payload
	// carrying both `txnNotFound` and validated transaction data was read as absence.
	//
	// A `txnNotFound` WITHOUT `searched_all` matches no variant and so lands here too, which is
	// right: it may mean the node simply lacks the ledger our payment is in — a resynced or
	// history-gapped member of a load-balanced endpoint — and reading that as non-inclusion declares
	// a settled payment expired, inviting the duplicate send `XrpSendExpiredError` calls safe.
	const parsed = XrplTxResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new XrplRpcError({
			method: 'tx',
			error: nonNullish(result.error)
				? String(result.error)
				: 'neither a validated result, a pending transaction, nor a fully searched absence'
		});
	}

	const { data } = parsed;

	// The fully-searched absence variant: the node looked everywhere in the range and it is not
	// there. The only state allowed to end the poll as non-inclusion, which is why it is reported
	// as its own rather than sharing `pending`'s shape.
	if ('error' in data) {
		return { state: 'absent' };
	}

	// The answer must be about the transaction we asked for. Nothing else in the response identifies
	// it, so without this a validated record for ANY transaction — another account's, or a proxy's
	// mismatched reply — is read as this payment's outcome, and a `tesSUCCESS` belonging to someone
	// else resolves the send as though the funds had moved. That is the only failure mode on this
	// path that reports success rather than failing closed.
	//
	// A mismatch tells us nothing about our own transaction, so it is indeterminate rather than a
	// failure: the poll retries it and the expiry recheck surfaces it.
	if (data.hash.toUpperCase() !== hash.toUpperCase()) {
		throw new Error(`Unexpected XRPL tx response: answered for ${data.hash}, asked for ${hash}`);
	}

	// `pending` carries nothing: the node holds the transaction but its ledger is not validated, so
	// there is no outcome to report yet — only the fact that the transaction exists, which is
	// precisely what rules out expiry.
	return data.validated === true
		? { state: 'validated', transactionResult: data.meta.TransactionResult }
		: { state: 'pending' };
};

/**
 * Broadcasts a signed transaction blob via the XRPL `submit` method.
 *
 * `accepted` reports whether THIS node took the transaction and `engine_result` is its
 * provisional result (e.g. `tesSUCCESS`, `terQUEUED`, `tecUNFUNDED_PAYMENT`). Neither is proof of
 * anything final: an applied `tec*` is accepted yet failed, and a refusal may still be reapplied
 * later. Only a malformed `tem*` result is conclusive (see `isXrpSubmitFinalFailure`); every other
 * outcome is settled by polling the tx hash (see {@link loadXrpTransactionOutcome}).
 */
export const submitXrpTransaction = async ({
	txBlob,
	network
}: {
	txBlob: string;
	network: XrpNetworkType;
}): Promise<XrpSubmitResult> => {
	const result = await xrpJsonRpc({ network, method: 'submit', params: { tx_blob: txBlob } });

	const parsed = XrplSubmitResultSchema.safeParse(result);

	if (!parsed.success) {
		throw new Error('Unexpected XRPL submit response: no string engine_result');
	}

	const { data } = parsed;

	return {
		engineResult: data.engine_result,
		engineResultMessage: data.engine_result_message,
		txHash: data.tx_json?.hash,
		// Reported for the caller's record only. It says this node took the transaction
		// (applied/queued/broadcast/kept), which is neither necessary nor sufficient for the send to
		// have happened, so it does not gate anything — see `isXrpSubmitFinalFailure`.
		accepted: data.accepted === true
	};
};
