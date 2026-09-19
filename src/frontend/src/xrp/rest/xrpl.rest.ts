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

		// A top-level status the envelope refused is a failure the body stated plainly, so it is
		// named as one rather than reported as a missing result — the same reasoning as the
		// top-level error above, for the other field that can say the call did not work.
		//
		// Presence, not `nonNullish`: a `status: null` is a malformed status rather than an absent
		// one, and it is the message that distinguishes them. Absent is the normal case — every
		// non-forwarded response and every error omits the field — so only a status that is present
		// and not `'success'` is reported here.
		if (
			typeof body === 'object' &&
			nonNullish(body) &&
			'status' in body &&
			body.status !== 'success'
		) {
			throw new XrplRpcError({ method, error: `top-level status ${String(body.status)}` });
		}

		throw new Error(`Unexpected XRPL ${method} response: no result object`);
	}

	const { result, status: envelopeStatus } = parsed.data;
	const { error, status } = result;

	// The outer claim against the inner one. The envelope validated `status` beside the result, and
	// the contradiction check further down compares `result.status` — a different field one level
	// down — so a body claiming success at the TOP while `result` carries an error satisfied every
	// check and reached `expectedErrors`, where a declared code is honoured as a state. For
	// `txnNotFound` that is `{ state: 'absent' }` and, past `LastLedgerSequence`, a definitive
	// expiry telling the caller a resend is safe.
	//
	// Before the expected-errors check rather than beside it: honouring a declared error after the
	// body has already claimed the call succeeded is the ordering that makes this reachable.
	if (envelopeStatus === 'success' && 'error' in result) {
		throw new XrplRpcError({
			method,
			error: `top-level success status with error ${String(error)}`
		});
	}

	// `result.status` is on every real response — `'success'`, or `'error'` alongside `error`,
	// `error_code` and `error_message` — and was previously ignored, so a FAILED response could
	// still deliver a plausible-looking result: the method schemas strip `status` as an unknown key,
	// and `{ status: 'error', ledger_current_index: <bogus> }` came back as an index. That is the
	// one payload the confirmation loop cannot defend against by arithmetic, because the first
	// validated index a run reads has nothing to corroborate it.
	//
	// Only these two values exist. Gated on presence, so a node that omits the field is still fine.
	if ('status' in result && status !== 'success' && status !== 'error') {
		throw new XrplRpcError({ method, error: `invalid status ${String(status)}` });
	}

	// An error status has to say WHICH error, or `expectedErrors` below cannot judge it and a
	// failure would pass as a result.
	if (status === 'error' && typeof error !== 'string') {
		throw new XrplRpcError({ method, error: 'error status without an error code' });
	}

	// Contradictory: one of the two is wrong and there is no way to tell which. Note this does NOT
	// catch the expected states — `actNotFound` and `txnNotFound` both arrive with
	// `status: 'error'`, verified against the configured endpoint, so the absence path is untouched.
	if (status === 'success' && 'error' in result) {
		throw new XrplRpcError({ method, error: `success status with error ${String(error)}` });
	}

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
 * Whether an `account_info` response answered for the snapshot that was asked for.
 *
 * `validated` is the field that says which one: `true` for the validated ledger, `false` for the
 * open one. The address check cannot tell the two apart, and `sendXrp` reads BOTH to take the lower
 * balance and the higher owner count — a pessimism that only holds if the two answers really are
 * two different ledgers. Two open answers size the maximum against an unvalidated credit that can
 * roll back (`tecUNFUNDED_PAYMENT`); two validated ones sign a sequence the open ledger has already
 * consumed (`tefPAST_SEQ`).
 */
const isXrpSnapshotForLedger = ({
	ledgerIndex,
	validated
}: {
	ledgerIndex: 'current' | 'validated';
	validated: boolean;
}): boolean => validated === (ledgerIndex === 'validated');

/**
 * Whether an `account_info` error response is about the account that was asked for.
 *
 * A success names its subject in `account_data.Account`; `actNotFound` names nothing, and it is
 * the answer read as "this account does not exist". Unbound, a stale or misrouted one reports the
 * WRONG account as absent — which for the destination read means `requiresTag` never fires and an
 * untagged payment goes to `tecDST_TAG_NEEDED`, fee claimed.
 *
 * Both echoes are checked because the provider answers `ledger_index: 'validated'` itself and
 * forwards `'current'` to rippled: the first carries only `request`, the second carries `account`
 * as well. Either one matching is enough — they are two views of the same request.
 *
 * Returns false when nothing identifies the response, so the caller can treat an unbindable answer
 * as unavailable rather than as absence. Verified against the configured endpoint that at least
 * one echo is always present, on both ledgers.
 */
const isXrpAccountErrorForAddress = ({
	address,
	account,
	request
}: {
	address: XrpAddress;
	account?: string;
	request?: Record<string, unknown>;
}): boolean => {
	// Everything the response CARRIES, not everything it could parse. Filtering to strings first
	// discarded a present-but-malformed identity before the comparison saw it, so
	// `{ account: <requested>, request: { account: 123 } }` passed on the strength of the good half
	// — a guard that gets weaker the more malformed the response is, which is backwards.
	//
	// `!== undefined` and NOT `nonNullish`: an explicit `null` is a malformed identity that has to
	// fail, and `nonNullish` would drop it back out of the comparison. Absent is the only thing
	// that may be skipped.
	const echoed = [account, request?.account].filter((value) => value !== undefined);

	// Raw comparison, like the `Account` one: a classic address is base58 over a checksummed
	// payload, so case is significant.
	return (
		echoed.length > 0 && echoed.every((value) => typeof value === 'string' && value === address)
	);
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

	if ('error' in data) {
		// Bound like the funded branch below. A misrouted `actNotFound` would otherwise display
		// another account's non-existence as this one's zero balance.
		if (!isXrpAccountErrorForAddress({ address, ...data })) {
			throw new Error(
				`Unexpected XRPL account_info response: an ${data.error} that does not identify ${address}`
			);
		}

		return ZERO;
	}

	// Asked for the validated ledger precisely so a displayed figure cannot roll back, so an
	// open-ledger answer accepted here defeats the reason this read is validated at all.
	if (!isXrpSnapshotForLedger({ ledgerIndex: 'validated', validated: data.validated })) {
		throw new Error(
			'Unexpected XRPL account_info response: an open-ledger snapshot for a validated read'
		);
	}

	// Bound to the address asked for, like the full snapshot. This one cannot cause a bad send —
	// `sendXrp` reads its own figures through `loadXrpAccountInfo` — but it is the balance the user
	// sees and decides on, and an unbound read would be the only one left on this path.
	if (data.account_data.Account !== address) {
		throw new Error(
			`Unexpected XRPL account_info response: answered for ${data.account_data.Account}, asked for ${address}`
		);
	}

	return BigInt(data.account_data.Balance);
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
	network,
	ledgerIndex
}: {
	address: XrpAddress;
	network: XrpNetworkType;
	ledgerIndex: 'current' | 'validated';
}): Promise<XrpAccountInfo> => {
	// The ledger is the caller's choice because the two snapshots answer different questions and
	// neither is safe for all of them.
	//
	// `Sequence` must come from the OPEN ledger: a transaction already in it — another device, or
	// this user's own send moments earlier — has consumed the next sequence without being validated
	// yet, and signing the validated one means XRPL answers `tefPAST_SEQ`.
	//
	// The reserve inputs must NOT come from one snapshot alone. The open ledger reflects pending
	// credits as well as debits, so `Balance` can sit ABOVE validated state and a maximum sized
	// against it offers money the account may not keep — `tecUNFUNDED_PAYMENT`, fee destroyed and
	// sequence consumed, which is the outcome the reserve guard exists to prevent. `OwnerCount`
	// fails the other way, since an object created in the open ledger raises the real reserve that
	// validated state understates. So the send reads both and takes the pessimistic value of each.
	//
	// The provider is Clio, which serves validated data only — `ledger_index: 'current'` is how its
	// own warning says to reach rippled instead, and that response comes back `forwarded: true`.
	const result = await xrpJsonRpc({
		network,
		method: 'account_info',
		params: { account: address, ledger_index: ledgerIndex },
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
	//
	// Only when the response identifies the account we asked about. An unbindable `actNotFound` is
	// an UNTYPED error on purpose: `readDestination` maps the typed one to "does not exist", which
	// above the reserve leaves `requiresTag` false and sends untagged into `tecDST_TAG_NEEDED`,
	// while the untyped one becomes an unavailable lookup that the tag guard now declines on.
	// Absence is a claim about a specific account; a response that names none makes no claim.
	if ('error' in data) {
		if (!isXrpAccountErrorForAddress({ address, ...data })) {
			throw new Error(
				`Unexpected XRPL account_info response: an ${data.error} that does not identify ${address}`
			);
		}

		throw new XrpAccountNotFoundError(`XRPL account not found: ${address}`);
	}

	// The answer must be about the snapshot we asked for, not only the account. See
	// `isXrpSnapshotForLedger` for what rides on it.
	if (!isXrpSnapshotForLedger({ ledgerIndex, validated: data.validated })) {
		throw new Error(
			`Unexpected XRPL account_info response: a ${data.validated ? 'validated' : 'open'}-ledger snapshot for a ${ledgerIndex} read`
		);
	}

	const { Account, Balance, Sequence, OwnerCount, Flags } = data.account_data;

	// The snapshot must be about the account we asked for. Nothing else in the response identifies
	// it, so without this a stale or misrouted answer — a proxy's mismatched reply, a cached one for
	// the previously requested address — is read as this account's state, and every consumer is then
	// working from another account's figures: a foreign `Sequence` signs a payment the ledger answers
	// `terPRE_SEQ`, which queues rather than fails and so outlives the poll that declares the send
	// expired and a resend safe; a foreign `Balance`/`OwnerCount` satisfies the reserve guard on
	// figures that are not this account's, and XRPL applies the result as `tecUNFUNDED_PAYMENT` —
	// fee claimed, sequence consumed; a foreign `Flags` decides the required-destination-tag guard
	// for the wrong account, which ends the same way as `tecDST_TAG_NEEDED`.
	//
	// Compared RAW, unlike the hex hash in `loadXrpTransactionOutcome`: a classic address is base58
	// over a checksummed payload, so case is significant and two forms differing only in case are
	// not the same account.
	if (Account !== address) {
		throw new Error(
			`Unexpected XRPL account_info response: answered for ${Account}, asked for ${address}`
		);
	}

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

	return parsed.data.ledgerIndex;
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
	// means "either the transaction does not exist, or it was part of a ledger version that xrpld
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
	// a settled payment expired, inviting the duplicate send that `XrpSendExpiredError` calls safe.
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
	//
	// And therefore the one that must be bound to the question. The validated and pending branches
	// carry a `hash` to compare; absence carries none, so the echoed request is the only identity
	// available — and without it a stale or misrouted `txnNotFound`, for another hash or another
	// range, is read as THIS payment's non-inclusion. Past `LastLedgerSequence` that is
	// `XrpSendExpiredError`, which tells the caller a fresh payment is safe to build.
	//
	// The range is compared too, not just the hash: absence only means anything over the ledgers
	// that were actually searched, so an answer about a different window says nothing about this
	// one even when it names the right transaction.
	// Narrowed on the error literal, not on `'error' in data`: the other two branches declare
	// `error?: undefined`, so the `in` check does not discriminate them and `request` is not
	// reachable through it.
	if (data.error === 'txnNotFound') {
		const { transaction, min_ledger: minLedger, max_ledger: maxLedger } = data.request;

		if (
			String(transaction).toUpperCase() !== hash.toUpperCase() ||
			minLedger !== firstLedgerSequence ||
			maxLedger !== lastLedgerSequence
		) {
			throw new Error(
				`Unexpected XRPL tx response: a txnNotFound for ${String(transaction)} over ${String(minLedger)}-${String(maxLedger)}, asked for ${hash} over ${firstLedgerSequence}-${lastLedgerSequence}`
			);
		}

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
		// It says this node took the transaction (applied/queued/broadcast/kept), which is neither
		// necessary nor sufficient for the send to have happened — so `accepted: false` never
		// creates a failure. It does decide one thing: a `tem*` is only a definitive rejection when
		// the node did NOT also claim to have taken the blob, because nothing can be both malformed
		// and accepted. See `isXrpSubmitFinalFailure`.
		//
		// Passed through rather than compared to `true`: the schema requires a boolean, so the
		// comparison would only be re-deriving what the parse already guarantees.
		accepted: data.accepted
	};
};
