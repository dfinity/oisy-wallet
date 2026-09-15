import * as z from 'zod';

// XRPL reports `Balance` as an **unsigned decimal** string of drops. `BigInt` would also
// accept signed (`"-1"`), hexadecimal (`"0x10"`) and numeric (`1`) forms, so the contract
// is pinned here rather than left to the conversion.
export const XrpDropsSchema = z.string().regex(/^\d+$/);

const XrplAccountInfoResultSchema = z.union([
	z.object({ account_data: z.object({ Balance: XrpDropsSchema }) }),
	z.object({ error: z.string() })
]);

export const XrplAccountInfoResponseSchema = z.object({
	result: XrplAccountInfoResultSchema
});
