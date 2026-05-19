import type {
	Icrc7CanistersSchema,
	Icrc7TokenSchema,
	Icrc7TokenWithoutIdSchema
} from '$icp/schema/icrc7-token.schema';
import type * as z from 'zod';

export type Icrc7Canisters = z.infer<typeof Icrc7CanistersSchema>;

export type Icrc7Token = z.infer<typeof Icrc7TokenSchema>;

export type Icrc7TokenWithoutId = z.infer<typeof Icrc7TokenWithoutIdSchema>;
