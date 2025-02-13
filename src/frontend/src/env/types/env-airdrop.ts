import type { AirdropEventsSchema } from '$env/schema/env-airdrop.schema';
import * as z from 'zod';

export type AirdropDescription = z.infer<typeof AirdropEventsSchema>;
