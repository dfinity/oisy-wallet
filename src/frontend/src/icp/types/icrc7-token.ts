import type { Icrc7TokenSchema } from '$icp/schema/icrc7-token.schema';
import type * as z from 'zod';

export type Icrc7Token = z.infer<typeof Icrc7TokenSchema>;
