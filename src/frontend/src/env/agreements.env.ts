import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreements } from '$env/types/env-agreements';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const NEW_AGREEMENTS_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_NEW_AGREEMENTS_ENABLED
);

export const agreementsData: EnvAgreements = EnvAgreementsSchema.parse(agreementsJson);
