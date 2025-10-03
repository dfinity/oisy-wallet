import * as z from 'zod';

const policyBlockSchema = z.object({
	lastUpdatedDate: z.iso.datetime(),
	lastUpdatedTimestamp: z.bigint()
});

export const EnvAgreementsSchema = z.object({
	termsOfUse: policyBlockSchema,
	privacyPolicy: policyBlockSchema,
	licenseAgreement: policyBlockSchema
});
