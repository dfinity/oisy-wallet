import type { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type * as z from 'zod';

export type EnvAgreements = z.infer<typeof EnvAgreementsSchema>;
