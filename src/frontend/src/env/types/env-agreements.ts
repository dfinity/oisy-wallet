import type { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type * as z from 'zod/v4';

export type EnvAgreement = z.infer<typeof EnvAgreementsSchema>;
