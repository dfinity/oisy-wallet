import type {
	IcPunksCanistersSchema,
	IcPunksTokenSchema,
	IcPunksTokenWithoutIdSchema
} from '$icp/schema/icpunks-token.schema';
import type * as z from 'zod';

export type IcPunksCanisters = z.infer<typeof IcPunksCanistersSchema>;

export type IcPunksToken = z.infer<typeof IcPunksTokenSchema>;

export type IcPunksTokenWithoutId = z.infer<typeof IcPunksTokenWithoutIdSchema>;
