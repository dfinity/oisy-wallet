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
