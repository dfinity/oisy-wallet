import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreements } from '$env/types/env-agreements';
import { transformAgreementsJsonBigint } from '$lib/utils/env.agreements.utils';

const agreementsParseResult = EnvAgreementsSchema.safeParse(
	transformAgreementsJsonBigint(agreementsJson)
);
if (!agreementsParseResult.success) {
	throw new Error(
		`Failed to parse agreements.json: ${JSON.stringify(agreementsParseResult.error.format())}`
	);
}

export const agreementsData: EnvAgreements = agreementsParseResult.data;
