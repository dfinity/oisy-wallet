import * as z from 'zod/v4';

const policyBlockSchema = z.object({
	lastUpdatedDate: z.string()
});

export const EnvAgreementsSchema = z.object({
	licenceAgreement: policyBlockSchema,
	termsOfUse: policyBlockSchema,
	privacyPolicy: policyBlockSchema
});
