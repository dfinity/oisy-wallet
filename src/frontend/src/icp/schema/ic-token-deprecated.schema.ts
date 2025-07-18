import * as z from 'zod/v4';

export const IcTokenDeprecatedSchema = z.object({
	deprecated: z.boolean().optional()
});
