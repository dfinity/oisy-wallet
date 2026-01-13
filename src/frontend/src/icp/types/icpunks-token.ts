import type { IcPunksTokenSchema } from '$icp/schema/icpunks-token.schema';
import type * as z from 'zod';

export type IcPunksToken = z.infer<typeof IcPunksTokenSchema>;
