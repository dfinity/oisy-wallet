import { isNullish, nonNullish } from '@dfinity/utils';
import * as z from 'zod';

// XRPL reports `Balance` as an **unsigned decimal** string of drops. `BigInt` would also
// accept signed (`"-1"`), hexadecimal (`"0x10"`) and numeric (`1`) forms, so the contract
// is pinned here rather than left to the conversion.
export const XrpDropsSchema = z.string().regex(/^\d+$/);

// The branches must be mutually exclusive: zod strips unknown keys and returns the
// first branch that parses, so without forbidding the opposite variant's key a
// response carrying both would be read as a balance and the error silently dropped.
export const XrplAccountInfoResultSchema = z.union([
	z.object({
		account_data: z.object({ Balance: XrpDropsSchema }),
		error: z.never().optional()
	}),
	z.object({
		error: z.string(),
		account_data: z.never().optional()
	})
]);

// The JSON-RPC envelope. `xrpJsonRpc` owns this so every helper receives a `result` object that
// exists and carries no unhandled `error`; before, each helper dereferenced `result.error` itself
// and a body without `result` produced a TypeError instead of the helper's own message.
//
// `error: z.never().optional()` for the same reason the result schemas below carry it, one level
// up: zod strips unknown keys, so a body with BOTH a top-level `error` and a `result` parsed with
// the error silently dropped, and the helpers inspect `result.error` — a different field. A failed
// response could therefore deliver a bogus `ledger_current_index`, which is exactly what makes
// confirmation declare expiry and tell the user a resend is safe.
//
// NOT `z.strictObject`: the configured provider is a Clio endpoint, and every response it sends
// carries `status`, `type`, `forwarded` and a `warnings` array beside the result. Rejecting unknown
// keys wholesale would reject every real response.
export const XrplEnvelopeSchema = z.object({
	result: z.record(z.string(), z.unknown()),
	error: z.never().optional()
});

// Counters the node reports as JSON numbers. A negative `OwnerCount` would *lower* the reserve
// and inflate the sendable maximum, and a fractional one throws inside `BigInt()` — so both are
// pinned rather than checked with `typeof`.
//
// Bounded to `UInt32`, which is what every field using this actually is: `Sequence` and
// `OwnerCount` per the AccountRoot reference, `Flags` and a ledger index likewise. Zod's `.int()`
// already stops at `Number.MAX_SAFE_INTEGER`, two million times more than the protocol can
// express, and the value that matters most is the validated ledger index — an out-of-range one
// past `LastLedgerSequence` makes confirmation declare expiry and tell the user a resend is safe.
//
// This bounds the number system, not the ledger: `0xFFFFFFFF` is still ~40x the current mainnet
// index, so `confirmXrpTransaction` also checks the index against the transaction's own window.
export const XrpLedgerCounterSchema = z.number().int().nonnegative().max(0xffff_ffff);

// These three validate the `result` object, because `xrpJsonRpc` unwraps the envelope before
// returning. Stricter than `XrplAccountInfoResultSchema`, which only needs `Balance`: building a
// payment also requires the sequence, and the reserve requires the owner count.
const XrplAccountDataSchema = z.object({
	// The account the snapshot is about, required so the caller can compare it with the address it
	// asked for. Nothing else in an `account_info` result identifies the subject, and every field
	// below is read as that account's state — so a snapshot of a DIFFERENT account is the same
	// hazard `loadXrpTransactionOutcome` already guards with `hash`, on the read it was missing
	// from. An AccountRoot always carries it.
	Account: z.string(),
	Balance: XrpDropsSchema,
	Sequence: XrpLedgerCounterSchema,
	OwnerCount: XrpLedgerCounterSchema,
	// The AccountRoot flag bits. `lsfRequireDestTag` is the one the send path reads: without it a
	// payment to an account that requires a destination tag is applied as `tecDST_TAG_NEEDED`,
	// which claims the fee and consumes the sequence.
	//
	// Required, because the protocol requires it: `Flags` is a mandatory AccountRoot field and an
	// account with none set reports `Flags: 0` rather than omitting it — confirmed against the
	// configured endpoint, on flagged and unflagged accounts alike. It was optional so an omission
	// left the flags merely unknown, but that turned a malformed response into a snapshot claiming
	// no requirement, which is the one reading of it that spends a fee. A response missing it is
	// now malformed, which the sender read fails closed on and the destination read reports as an
	// unanswerable lookup.
	Flags: XrpLedgerCounterSchema
});

// Mutually exclusive, like `XrplAccountInfoResultSchema` and `XrplTxResultSchema`: `account_data`
// XOR the one error that can reach here. `xrpJsonRpc` throws for every other error this method can
// return, so `actNotFound` is literally the only alternative — and giving it a branch is what lets
// the caller decide absence AFTER parsing. Deciding it beforehand meant a response carrying both
// `actNotFound` and `account_data` was read as absence, discarding the `Flags` the send path reads.
export const XrplAccountInfoFullResultSchema = z.union([
	z.object({
		account_data: XrplAccountDataSchema,
		error: z.never().optional()
	}),
	z.object({
		error: z.literal('actNotFound'),
		account_data: z.never().optional()
	})
]);

export const XrplFeeResultSchema = z.object({
	drops: z
		.object({
			open_ledger_fee: XrpDropsSchema.optional(),
			base_fee: XrpDropsSchema.optional()
		})
		.optional()
});

// `error: z.never()` on every branch below, for the reason the account-info union already
// documents: zod strips unknown keys, so without forbidding it a failed response that also
// carried a plausible index would parse as a result and the error would be dropped. That matters
// most for the validated index — a bogus one past `LastLedgerSequence` makes confirmation declare
// expiry and tell the user a resend is safe.
export const XrplLedgerCurrentResultSchema = z.object({
	ledger_current_index: XrpLedgerCounterSchema,
	error: z.never().optional()
});

// The `ledger` command reports the index at the top level, nested under `ledger`, or — as the
// configured provider does — both. `validated` must be true: a non-validated ledger's index can be
// ahead of the last validated one, which is the open-vs-validated confusion this call exists to
// avoid. The ledger header quotes its `ledger_index`, unlike the numeric top-level field, so the
// nested form accepts either and normalises to a number.
const XrpNestedLedgerIndexSchema = z.union([
	XrpLedgerCounterSchema,
	XrpDropsSchema.transform(Number).pipe(XrpLedgerCounterSchema)
]);

// One object with both forms optional, NOT a union of the two. A union returns the first branch
// that parses and strips the other field as unknown, so a response carrying two CONTRADICTORY
// indices was accepted and the higher one could be the one read — and a high index past
// `LastLedgerSequence` is what makes confirmation declare expiry and tell the user a resend is
// safe. Mutually exclusive branches would be the wrong cure: carrying both is the NORMAL case for
// this provider, so rejecting it would reject every real response. Only disagreement is suspicious,
// and it is compared after normalising, since the two forms differ in type.
export const XrplLedgerResultSchema = z
	.object({
		validated: z.literal(true),
		ledger_index: XrpLedgerCounterSchema.optional(),
		ledger: z.object({ ledger_index: XrpNestedLedgerIndexSchema }).optional(),
		error: z.never().optional()
	})
	.refine(
		({ ledger_index: topLevel, ledger }) => nonNullish(topLevel) || nonNullish(ledger),
		'neither a top-level nor a nested ledger_index'
	)
	.refine(
		({ ledger_index: topLevel, ledger }) =>
			isNullish(topLevel) || isNullish(ledger) || topLevel === ledger.ledger_index,
		'the top-level and nested ledger_index disagree'
	)
	// Normalised here so the caller has one index to read rather than a shape to choose between.
	.transform(({ ledger_index: topLevel, ledger }) => ({
		ledgerIndex: topLevel ?? (ledger?.ledger_index as number)
	}));

// `validated` means FINAL, not successful, so a validated response must carry the result that
// decides which it was. One that does not is malformed — and reading it as a missing result would
// report an applied payment as failed, inviting a duplicate send — so the validated branch
// requires a string `meta.TransactionResult` and anything else fails to parse. A still-pending
// entry has no result yet and says so with an explicit `validated: false`.
// `hash` is what binds the answer to the question. `tx` echoes the id it looked up, and BOTH
// branches require it: the validated one ends the poll and decides the outcome, so accepting a
// record that identifies a different transaction would report someone else's `tesSUCCESS` as this
// payment's, and requiring it on the pending branch too means the identity comparison cannot be
// skipped by omitting the field.
export const XrplTxResultSchema = z.union([
	// Validated: final, and it must say WHICH transaction and WHAT happened.
	z.object({
		validated: z.literal(true),
		hash: z.string(),
		// Only `tes` and `tec` results are ever APPLIED to a ledger — which is why they are the ones
		// that claim the fee and consume the sequence — so a validated record carrying anything else
		// is malformed. It matters because the caller turns every non-`tesSUCCESS` value into
		// `XrpTransactionFailedError`, a definitive "your payment failed"; rejecting instead leaves
		// the run indeterminate, which hands back the blob rather than asserting an outcome.
		//
		// `tesSUCCESS` is the whole `tes` class, and the pattern was checked against
		// `ripple-binary-codec`'s own `TRANSACTION_RESULTS`: it matches all 82 `tec` codes and none
		// of the 106 `tef`/`tel`/`tem`/`ter` ones. A pattern rather than that list, because the list
		// lives only in the package's `dist` and nothing here deep-imports a `dist` — and a pattern
		// keeps matching if the protocol adds an 83rd.
		meta: z.object({
			TransactionResult: z.union([z.literal('tesSUCCESS'), z.string().regex(/^tec[A-Z0-9_]+$/)])
		}),
		error: z.never().optional()
	}),
	// Absent: the node confirms it searched every ledger in the requested range. This is the only
	// shape that may be read as non-inclusion, because non-inclusion is what ends the send.
	//
	// And therefore the branch that must contradict itself the least. Zod strips unknown keys, so
	// every field that would DISPUTE absence has to be forbidden by name or it is simply dropped:
	// a payload carrying `txnNotFound` and `searched_all` beside a transaction still parsed here,
	// and past `LastLedgerSequence` this branch is what throws `XrpSendExpiredError` and tells the
	// caller a resend is safe. `validated` and `meta` were already named; `hash`, `tx` and
	// `tx_json` are the three ways a `tx` result reports the transaction itself, and the other two
	// branches require `hash` precisely because it is what binds an answer to the question.
	//
	// Nothing real is rejected: a `txnNotFound` from the configured endpoint carries `error`,
	// `error_code`, `error_message`, `searched_all`, `request`, `status` and `type` — none of the
	// three, and the rest are stripped as the unknown keys they are.
	z.object({
		error: z.literal('txnNotFound'),
		searched_all: z.literal(true),
		validated: z.never().optional(),
		meta: z.never().optional(),
		hash: z.never().optional(),
		tx: z.never().optional(),
		tx_json: z.never().optional()
	}),
	// Pending: in a ledger but not yet validated. It has to say so POSITIVELY — when the pending
	// branch was "everything optional", `{}` and `{ anything: 1 }` both parsed as pending, and at
	// the expiry recheck pending means "the ledger passed LastLedgerSequence without including it",
	// which throws `XrpSendExpiredError` and tells the caller a resend is safe. `hash` is required
	// so the identity comparison cannot be skipped by omitting it.
	z.object({
		validated: z.literal(false),
		hash: z.string(),
		error: z.never().optional()
	})
]);

// `engine_result` is the only field the send still reads, and it is read with `startsWith` outside
// the try that wraps the submit — so a non-string would throw there, after the blob was broadcast,
// and turn an ambiguous submit into a reported failure. Validating it here keeps that failure
// inside the caught call, where it correctly means "go and confirm". The rest is optional because
// none of it decides anything: the hash is derived locally and `accepted` no longer gates.
export const XrplSubmitResultSchema = z.object({
	engine_result: z.string(),
	error: z.never().optional(),
	// Strict only where the decision reads. These three are cosmetic or unused — the message is
	// interpolated into an error, the hash is derived locally and `accepted` is compared to `true`
	// — so a malformed one must not fail the parse: that would throw, and the send would poll for a
	// minute over a field it never consults.
	engine_result_message: z.string().optional().catch(undefined),
	accepted: z.unknown().optional(),
	tx_json: z
		.object({ hash: z.string().optional().catch(undefined) })
		.optional()
		.catch(undefined)
});
