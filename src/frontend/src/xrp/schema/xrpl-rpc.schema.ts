import { XRP_MAX_DROPS } from '$xrp/constants/xrp.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import * as z from 'zod';

// XRPL reports `Balance` as an **unsigned decimal** string of drops. `BigInt` would also
// accept signed (`"-1"`), hexadecimal (`"0x10"`) and numeric (`1`) forms, so the contract
// is pinned here rather than left to the conversion.
//
// Bounded as well as shaped, which is the rule `XrpLedgerCounterSchema` already applies to every
// counter: any run of digits parsed, `BigInt` converted it happily, and an inflated `Balance` runs
// through `getXrpMaxAmount` into the reserve guard — so a send far above the real balance passes
// the check written to stop exactly that, and XRPL applies it as `tecUNFUNDED_PAYMENT`.
//
// Compared through `BigInt`, since the value can exceed `Number`'s safe range. The shape is
// re-tested inside the check rather than relied on from the `regex` above it: zod evaluates both,
// so a `'1.5'` that already failed the regex would still reach `BigInt` and throw OUT of
// `safeParse` instead of being reported as invalid. A shape the regex rejects passes this check
// and fails on its own issue.
const XRP_DROPS_PATTERN = /^\d+$/;

// Derived rather than written: 18 today, and still right if the ceiling ever moves.
const XRP_MAX_DROPS_DIGITS = `${XRP_MAX_DROPS}`.length;

export const XrpDropsSchema = z
	.string()
	.regex(XRP_DROPS_PATTERN)
	// Canonicalised BEFORE the bound is checked, so the value that LEAVES this schema is the one
	// the bound was applied to. Validating the stripped form while returning the original was the
	// gap: every caller converts what the schema returns — `loadXrpBalance`,
	// `loadXrpAccountInfo` and `loadXrpOpenLedgerFee` all call `BigInt` on it — so a zero-padded
	// field passed the length bound on its few significant digits and was then converted
	// downstream at full length.
	//
	// `^0+(?=\d)` and not `^0+`: the lookahead keeps the last digit, so `'0'` and a million zeros
	// both canonicalise to `'0'` rather than to the empty string `BigInt` would reject.
	//
	// Stripping here rather than again inside the check means the string is scanned once. The cost
	// this removes is modest — leading zeros cannot make a large number, so it is a linear scan
	// (~0.4ms per million) rather than the superlinear arithmetic a million nines costs (~40ms),
	// and that case the bound below already rejects. The point is the invariant: what comes out is
	// what a caller can safely convert, with no reasoning about whether a long-but-small number
	// happens to be cheap in this engine.
	.transform((drops) => (XRP_DROPS_PATTERN.test(drops) ? drops.replace(/^0+(?=\d)/, '') : drops))
	.refine((drops) => {
		// zod evaluates this even when the regex already failed, so a non-decimal string must leave
		// before it reaches any conversion.
		if (!XRP_DROPS_PATTERN.test(drops)) {
			return true;
		}

		// Length before value, on a string the transform has already canonicalised: nothing longer
		// than the ceiling can be within it, so only a bounded string is ever converted — now true
		// of the caller's conversion as well as this one.
		return drops.length <= XRP_MAX_DROPS_DIGITS && BigInt(drops) <= XRP_MAX_DROPS;
	});

/**
 * The request a node echoes back inside `result.request`.
 *
 * It is the only identity an ERROR response carries. A successful `account_info` names its subject
 * in `account_data.Account` and a validated `tx` names it in `hash`, but `actNotFound` and
 * `txnNotFound` carry neither — and those are precisely the answers this client reads as "the
 * account does not exist" and "the payment is not in any ledger". Unbound, a stale or misrouted
 * one of either is believed about the wrong subject.
 *
 * Two shapes, because the provider answers some methods itself and forwards others to rippled, and
 * the two echo differently — verified against the configured endpoint:
 *   Clio:    `{ method: 'account_info', params: [{ account, ledger_index }] }`
 *   rippled: `{ command: 'account_info', account, ledger_index }`
 * Both are accepted and normalised to the same pair, so a caller compares values rather than
 * choosing a shape. Neither matching is not an error here: the caller decides what an unbindable
 * response means, and for both readers above it means indeterminate rather than absent.
 *
 * The branches are mutually exclusive, the rule this file already applies to `account_data` XOR
 * `error` and to the three `tx` variants: zod strips unknown keys, so a branch that does not
 * forbid the opposite discriminator silently drops it and parses anyway — and a payload carrying
 * BOTH `method` and `command` was accepted under whichever branch came first, contradiction and
 * all, on the two answers that end a send.
 *
 * `operation` rather than parameters alone, because an echo says two things and only one of them
 * was being kept: what was asked, and what it was asked OF. The Clio branch discarded `method`
 * outright. On its own that is defence in depth — a `tx` echo carries no `account` and an
 * `account_info` echo carries no `transaction`, so neither can satisfy the other reader's
 * comparison by accident — but it is a second, independent assertion on the only identity an error
 * response has, and both shapes already state it.
 */
export const XrplRequestEchoSchema = z.union([
	z
		.object({
			method: z.string(),
			params: z.tuple([z.record(z.string(), z.unknown())]),
			command: z.never().optional(),
			// The identity belongs inside `params[0]` on this shape, so a copy BESIDE it is a second
			// claim that can disagree — and `z.object` strips what it does not name, which kept the
			// half that matched and dropped the half that did not. These five are exactly the fields
			// the two bindings compare, so a contradictory claim about which account or which
			// transaction the response answers for is refused rather than half-read.
			//
			// Named rather than `z.strictObject`: a JSON-RPC echo may legitimately carry `id` or
			// `jsonrpc`, and rejecting every unexpected sibling would stop absence parsing the first
			// time one appeared — which takes expiry detection with it.
			account: z.never().optional(),
			ledger_index: z.never().optional(),
			transaction: z.never().optional(),
			min_ledger: z.never().optional(),
			max_ledger: z.never().optional()
		})
		.transform(({ method, params }) => ({ operation: method, params: params[0] })),
	// Flat, so the identity fields ARE the siblings and there is no second place for a duplicate to
	// hide — `params` being forbidden is what keeps it that way.
	z
		.object({
			command: z.string(),
			method: z.never().optional(),
			params: z.never().optional()
		})
		.catchall(z.unknown())
		.transform(({ command, method: _method, params: _params, ...params }) => ({
			operation: command,
			params
		}))
]);

// The branches must be mutually exclusive: zod strips unknown keys and returns the
// first branch that parses, so without forbidding the opposite variant's key a
// response carrying both would be read as a balance and the error silently dropped.
export const XrplAccountInfoResultSchema = z.union([
	z.object({
		// `Account` for the same reason the full snapshot carries it: nothing else in the result says
		// whose balance this is, so a stale or misrouted answer would otherwise be displayed as this
		// account's. Only `Balance` is needed beyond that — this feeds the balance store, not a send.
		account_data: z.object({ Account: z.string(), Balance: XrpDropsSchema }),
		validated: z.boolean(),
		error: z.never().optional()
	}),
	// `actNotFound` carries no `account_data` to name its subject, so the identity has to come from
	// what the node echoed back. See `XrplRequestEchoSchema`.
	z.object({
		error: z.string(),
		account_data: z.never().optional(),
		account: z.string().optional(),
		request: XrplRequestEchoSchema.optional(),
		// See the note on the full schema's `actNotFound` branch: accepted so a forwarded absence
		// parses, compared by the caller so a contradictory one cannot pass as this snapshot.
		validated: z.boolean().optional()
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
//
// `status` is the one of those four that decides something, so it is pinned rather than stripped.
// `xrpJsonRpc` checks `result.status` — a DIFFERENT field, one level down — so a top-level status
// was dropped as an unknown key and a body saying `status: 'error'` beside a plausible
// `ledger_current_index` passed as a successful index, which is the payload that drives
// confirmation into a definitive expiry.
//
// `'success'` and not a union of both, because that is the whole contract this provider has: a
// top-level `status` appears only on FORWARDED successes and is always `'success'` — on every
// error, including `actNotFound` and `invalidParams`, there is no top-level status at all and the
// error lives in `result`. So a top-level status that is not `'success'` is not a response this
// endpoint produces.
export const XrplEnvelopeSchema = z.object({
	result: z.record(z.string(), z.unknown()),
	error: z.never().optional(),
	status: z.literal('success').optional()
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
// `validated` says WHICH snapshot answered, and it is the only field that does so on both forms:
// a validated response carries `validated: true` with `ledger_index` and `ledger_hash`, an open one
// `validated: false` with `ledger_current_index`. The caller asks for one of the two and the address
// check cannot tell them apart, so without this a response for the other snapshot passes — and
// `sendXrp` reads BOTH to take the lower balance and the higher owner count, a pessimism that only
// holds if the two answers really are two ledgers.
//
// On the funded branch only. An `actNotFound` from the direct path carries no ledger metadata at
// all, so requiring it there would refuse every real absence on the validated ledger — and that
// branch has no `Balance`, `Sequence` or `OwnerCount` to be wrong about, which is where both
// consequences live.
export const XrplAccountInfoFullResultSchema = z.union([
	z.object({
		account_data: XrplAccountDataSchema,
		validated: z.boolean(),
		error: z.never().optional()
	}),
	z.object({
		error: z.literal('actNotFound'),
		account_data: z.never().optional(),
		// The only identity this branch can carry, and the one the destination read depends on: an
		// unbound `actNotFound` reports SOME account as absent, and above the reserve that skips the
		// required-destination-tag check and sends untagged into `tecDST_TAG_NEEDED`.
		account: z.string().optional(),
		request: XrplRequestEchoSchema.optional(),
		// Carried on the forwarded path and absent on the direct one — verified against the
		// configured endpoint, which answers `validated: false` for a `current` absence and omits the
		// field entirely for a `validated` one. So it is accepted, not required and not forbidden:
		// requiring it would reject every real open-ledger absence, and forbidding it would do the
		// same. Stripping it silently was the third option and the wrong one — it is a claim about
		// WHICH snapshot answered, and the caller compares it with the ledger it asked for.
		validated: z.boolean().optional()
	})
]);

/**
 * `account_tx`, success only — the `actNotFound` branch is handled by `expectedErrors` on the
 * envelope and synthesises an empty page without reaching here.
 *
 * Two things are required and nothing else is: the account the result belongs to, and an array of
 * entries. The entries themselves stay `unknown` on purpose — `mapXrpTransaction` already drops
 * anything it cannot read, field by field, and duplicating that here would be a second set of
 * rules to keep in step with the first.
 *
 * `account` is required for the reason stated on the balance schemas: nothing else in the result
 * says whose history this is, and an unbound answer read as this account's would show one wallet's
 * activity under another's. `transactions` is required because its absence is what silently became
 * an empty history — the one outcome the `expectedErrors` note on the caller exists to prevent.
 */
/**
 * `account_tx`, error branch — in practice only `actNotFound`, the one error the caller declares as
 * expected. Nothing here is required: the identity may arrive as the top-level `account`, as the
 * echoed request, or not at all, and the caller decides what that means. It is parsed rather than
 * read off `unknown` so a malformed identity reaches the comparison instead of being dropped by a
 * type filter before it gets there.
 */
/**
 * One `account_tx` row, constrained to exactly the fields `mapXrpTransaction` consumes.
 *
 * Defined here with the other RPC shapes but applied in the mapper, not at the RPC boundary: the
 * mapper is what decides whether a row is readable, and a row it rejects is skipped rather than
 * failing the page. Three review rounds arrived at this — guards were added field by field and the
 * next unguarded one was found the same way each time, because a list of `if`s is exhaustive only
 * by inspection.
 *
 * Permissive about what it does not consume: unmodelled fields are stripped, not rejected, so a
 * node adding one does not empty a history. Strict about what it does, because those values reach
 * the store — an object `hash` became a key that stringifies to `[object Object]`.
 *
 * `Amount`, `SendMax` and `delivered_amount` stay string-or-object on purpose. An issued-currency
 * amount is a legitimate row, not a malformed one; the mapper decides what to do with it.
 *
 * The string arm is `XrpDropsSchema`, not a bare digit string, for the reason that schema states
 * about itself: every caller converts what it returns, and both these fields reach `BigInt`. A
 * plain `/^\d+$/` accepts a million digits from an untrusted response and costs ~40ms to convert
 * — per row, on a 10s poll, for a payload that is free to send. Bounded, the same row is skipped
 * in ~1.6ms. `delivered_amount: "unavailable"` is rejected by this arm rather than by the mapper's
 * own check now, which reaches the same outcome by a shorter path.
 */
const XrpAmountFieldSchema = z.union([XrpDropsSchema, z.record(z.string(), z.unknown())]);

const XrpAccountTransactionSchema = z.object({
	TransactionType: z.string(),
	Account: z.string(),
	Destination: z.string().optional(),
	Amount: XrpAmountFieldSchema.optional(),
	SendMax: XrpAmountFieldSchema.optional(),
	Fee: XrpDropsSchema.optional(),
	DestinationTag: z.number().int().optional(),
	hash: z.string().optional(),
	ledger_index: z.number().int().optional(),
	date: z.number().int().optional()
});

export const XrpAccountTransactionEntrySchema = z.object({
	tx: XrpAccountTransactionSchema.optional(),
	tx_json: XrpAccountTransactionSchema.optional(),
	meta: z
		.object({
			TransactionResult: z.string().optional(),
			delivered_amount: XrpAmountFieldSchema.optional()
		})
		.optional(),
	validated: z.boolean().optional(),
	hash: z.string().optional(),
	ledger_index: z.number().int().optional()
});

export const XrplAccountTxErrorSchema = z.object({
	error: z.string(),
	account: z.string().optional(),
	request: XrplRequestEchoSchema.optional(),
	// The two `account_tx` schemas are a discriminated pair, like every other result in this file.
	// Without this, `{ error: 'actNotFound', transactions: [...] }` parses here — objects strip
	// unknown keys — and the caller, which branches on `error` before parsing anything, returns an
	// empty page while the node supplied history in the same payload. Worse than a rejected
	// response, because an empty page is recorded as settled rather than retried.
	transactions: z.never().optional()
});

export const XrplAccountTxResultSchema = z.object({
	account: z.string(),
	transactions: z.array(z.unknown()),
	marker: z.unknown().optional(),
	// The other half of the pair. Redundant today, since the caller tests `error` first and never
	// reaches this schema with one — which is exactly the kind of fact that stops being true, and
	// the reason every other result schema here carries it anyway.
	error: z.never().optional()
});

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
	// And therefore the branch that must contradict itself the least, which is why it is the one
	// `z.strictObject` rather than a list of forbidden fields. Zod strips unknown keys, so anything
	// disputing absence is dropped unless the schema accounts for it — and naming the disputing
	// fields one by one is an open-ended question. A `tx` result carries the transaction at the TOP
	// LEVEL of `result`, not nested: a validated payment answers with `Account`, `Fee`,
	// `LastLedgerSequence`, `Sequence`, `SigningPubKey`, `TransactionType`, `TxnSignature`, `ctid`,
	// `date`, `hash`, `inLedger`, `ledger_index`, `meta`, `status` and `validated` side by side. An
	// earlier version of this branch forbade five of those, so the rest still stripped and the
	// payload parsed as a fully searched absence — which past `LastLedgerSequence` becomes
	// `XrpSendExpiredError`, the one result that tells a retry to build a new transaction on a new
	// sequence. Listing what absence MAY contain is the closed question, and the only form that
	// stays correct as the protocol grows.
	//
	// Strict here and NOT on the envelope, which looks like the same call and is not: the envelope
	// wraps every response and this provider sends `status`, `type`, `forwarded` and `warnings`
	// beside every result, so strictness there would reject all of them. This is a narrow error
	// shape, and the keys below are the complete set the configured endpoint returns — verified
	// across the ranged request this code sends, a far-past range, no range at all, and
	// `binary: true`. If a provider ever adds a sixteenth key, absence stops parsing and the
	// outcome is indeterminate: the poll keeps running and cannot conclude expiry, which is the
	// direction this path must fail in.
	z.strictObject({
		error: z.literal('txnNotFound'),
		searched_all: z.literal(true),
		// Metadata the node sends alongside. `status` is pinned rather than merely allowed because
		// `xrpJsonRpc` already established that `txnNotFound` arrives as `status: 'error'`, so
		// anything claiming otherwise is not the error response this branch describes.
		error_code: z.unknown().optional(),
		error_message: z.unknown().optional(),
		// Required and parsed, not waved through as arbitrary data: it is the ONLY identity this
		// branch can carry. The validated and pending branches are bound by `hash`; absence has no
		// hash to be bound by, and it is the variant that ends the send — a stale or misrouted
		// `txnNotFound` read as this payment's absence becomes `XrpSendExpiredError` past
		// `LastLedgerSequence`, which tells the caller a fresh payment is safe to build.
		request: XrplRequestEchoSchema,
		status: z.literal('error').optional(),
		type: z.unknown().optional()
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
	// Strict only where the decision reads. These two are cosmetic — the message is interpolated
	// into an error and the hash is derived locally — so a malformed one must not fail the parse:
	// that would throw, and the send would poll for a minute over a field it never consults.
	engine_result_message: z.string().optional().catch(undefined),
	// `accepted` is not one of them any more. It decides, alongside `engine_result`, whether a
	// `tem*` is a definitive rejection: only a node that did NOT claim to take the blob makes that
	// claim credible. Left as `z.unknown().optional()` and normalised with `=== true`, every
	// malformed value — `'true'`, `1`, `null`, or the field missing — collapsed to `false` and
	// turned a contradictory response into a reported rejection AFTER the blob was broadcast,
	// which is the outcome that check exists to avoid.
	//
	// Required, so a malformed one fails the parse instead. `submitXrpTransaction` then throws,
	// `sendXrp` treats that exactly as a lost response, and the send falls through to confirmation
	// where the hash decides. That is the direction this path has to fail in.
	accepted: z.boolean(),
	// The hash the node echoes back. Optional on purpose — the id is derived locally precisely so a
	// lost or partial submit response stays survivable, and requiring it would turn a node that
	// omits `tx_json` into a poll on every send. But SHAPED, because it is no longer only
	// cosmetic: the rejection branch compares it with the locally derived id before treating a
	// `tem*` as definitive, and a malformed value must not be able to satisfy that comparison.
	tx_json: z
		.object({
			hash: z
				.string()
				.regex(/^[0-9a-fA-F]{64}$/)
				.optional()
				.catch(undefined)
		})
		.optional()
		.catch(undefined)
});
