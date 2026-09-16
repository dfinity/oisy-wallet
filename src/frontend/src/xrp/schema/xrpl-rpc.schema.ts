import * as z from 'zod';

// XRPL reports `Balance` as an **unsigned decimal** string of drops. `BigInt` would also
// accept signed (`"-1"`), hexadecimal (`"0x10"`) and numeric (`1`) forms, so the contract
// is pinned here rather than left to the conversion.
export const XrpDropsSchema = z.string().regex(/^\d+$/);

// The branches must be mutually exclusive: zod strips unknown keys and returns the
// first branch that parses, so without forbidding the opposite variant's key a
// response carrying both would be read as a balance and the error silently dropped.
const XrplAccountInfoResultSchema = z.union([
	z.object({
		account_data: z.object({ Balance: XrpDropsSchema }),
		error: z.never().optional()
	}),
	z.object({
		error: z.string(),
		account_data: z.never().optional()
	})
]);

export const XrplAccountInfoResponseSchema = z.object({
	result: XrplAccountInfoResultSchema
});

// Counters the node reports as JSON numbers. A negative `OwnerCount` would *lower* the reserve
// and inflate the sendable maximum, and a fractional one throws inside `BigInt()` — so both are
// pinned to a non-negative safe integer rather than checked with `typeof`.
export const XrpLedgerCounterSchema = z.number().int().nonnegative();

// These three validate the `result` object, because `xrpJsonRpc` unwraps the envelope before
// returning. Stricter than `XrplAccountInfoResponseSchema`, which only needs `Balance`: building a
// payment also requires the sequence, and the reserve requires the owner count.
const XrplAccountDataSchema = z.object({
	Balance: XrpDropsSchema,
	Sequence: XrpLedgerCounterSchema,
	OwnerCount: XrpLedgerCounterSchema
});

export const XrplAccountInfoFullResultSchema = z.union([
	z.object({ account_data: XrplAccountDataSchema, error: z.never().optional() }),
	z.object({ error: z.string(), account_data: z.never().optional() })
]);

export const XrplFeeResultSchema = z.object({
	drops: z
		.object({
			open_ledger_fee: XrpDropsSchema.optional(),
			base_fee: XrpDropsSchema.optional()
		})
		.optional()
});

export const XrplLedgerCurrentResultSchema = z.object({
	ledger_current_index: XrpLedgerCounterSchema
});

// The `ledger` command reports the index either at the top level or nested under `ledger`,
// depending on the node. `validated` must be true: a non-validated ledger's index can be ahead
// of the last validated one, which is the open-vs-validated confusion this call exists to avoid.
// The ledger header quotes its `ledger_index`, unlike the numeric top-level field, so the nested
// branch accepts either form and normalises to a number.
const XrpNestedLedgerIndexSchema = z.union([
	XrpLedgerCounterSchema,
	XrpDropsSchema.transform(Number).pipe(XrpLedgerCounterSchema)
]);

export const XrplLedgerResultSchema = z.union([
	z.object({ validated: z.literal(true), ledger_index: XrpLedgerCounterSchema }),
	z.object({
		validated: z.literal(true),
		ledger: z.object({ ledger_index: XrpNestedLedgerIndexSchema })
	})
]);
