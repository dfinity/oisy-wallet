import * as z from 'zod';
import { TokenSchema } from '$lib/schema/token.schema';

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
});

export const NftSchema = z.object({
	name: z.string(),
	id: z.number(),
	imageUrl: z.string().url(),
	attributes: z.array(NftAttributeSchema),
	contract: TokenSchema
}).strict();
