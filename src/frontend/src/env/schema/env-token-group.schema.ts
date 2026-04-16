import * as z from 'zod';

export const OptionalEnvTokenGroupDataSchema = z.object({
	groupDataId: z.string().optional()
});
