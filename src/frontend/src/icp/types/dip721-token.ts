import type { Dip721TokenSchema } from '$icp/schema/dip721-token.schema';
import type * as z from 'zod';


export type Dip721Token = z.infer<typeof Dip721TokenSchema>;
