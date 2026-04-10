import type { IcpSwapTokenSchema } from '$lib/schema/icpswap.schema';
import type * as z from 'zod';

export type IcpSwapToken = z.infer<typeof IcpSwapTokenSchema>;
