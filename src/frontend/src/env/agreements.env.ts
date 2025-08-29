import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreements } from '$env/types/env-agreements';
import { transformAgreementsJsonBigint } from '$lib/utils/agreements.utils';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const NEW_AGREEMENTS_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_NEW_AGREEMENTS_ENABLED
);

const agreementsParseResult = EnvAgreementsSchema.safeParse(
	transformAgreementsJsonBigint(agreementsJson)
);
if (!agreementsParseResult.success) {
	throw new Error(
		`Failed to parse agreements.json: ${JSON.stringify(agreementsParseResult.error.format())}`
	);
}

export const agreementsData: EnvAgreements = agreementsParseResult.data;
