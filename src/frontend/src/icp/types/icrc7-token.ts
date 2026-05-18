import type { Icrc7TokenSchema, Icrc7TokenWithoutIdSchema } from '$icp/schema/icrc7-token.schema';
import type * as z from 'zod';

export type Icrc7Token = z.infer<typeof Icrc7TokenSchema>;

export type Icrc7TokenWithoutId = z.infer<typeof Icrc7TokenWithoutIdSchema>;
