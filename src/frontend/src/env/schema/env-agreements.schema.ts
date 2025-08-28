import * as z from 'zod/v4';

const policyBlockSchema = z.object({
	lastUpdatedDate: z.iso.datetime(),
	lastUpdatedTimestamp: z.bigint()
});

export const EnvAgreementsSchema = z.object({
	licenceAgreement: policyBlockSchema,
	termsOfUse: policyBlockSchema,
	privacyPolicy: policyBlockSchema
});
