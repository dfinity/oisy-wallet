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
	Balance: XrpDropsSchema,
	Sequence: XrpLedgerCounterSchema,
	OwnerCount: XrpLedgerCounterSchema,
	// The AccountRoot flag bits. `lsfRequireDestTag` is the one the send path reads: without it a
	// payment to an account that requires a destination tag is applied as `tecDST_TAG_NEEDED`,
	// which claims the fee and consumes the sequence. Optional so a node that omits the field
	// leaves the flags unknown rather than failing the whole read.
	Flags: XrpLedgerCounterSchema.optional()
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
		meta: z.object({ TransactionResult: z.string() }),
		error: z.never().optional()
	}),
	// Absent: the node confirms it searched every ledger in the requested range. This is the only
	// shape that may be read as non-inclusion, because non-inclusion is what ends the send.
	z.object({
		error: z.literal('txnNotFound'),
		searched_all: z.literal(true),
		validated: z.never().optional(),
		meta: z.never().optional()
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
