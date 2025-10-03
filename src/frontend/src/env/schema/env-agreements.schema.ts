import * as z from 'zod';

const policyBlockSchema = z.object({
	lastUpdatedDate: z.iso.datetime(),
	lastUpdatedTimestamp: z.bigint(),
	// For example, jq -r '.license_agreement.text.body' src/frontend/src/lib/i18n/en.json | sha256sum
	textSha256: z.string().length(64)
});

export const EnvAgreementsSchema = z.object({
	termsOfUse: policyBlockSchema,
	privacyPolicy: policyBlockSchema,
	licenseAgreement: policyBlockSchema
});
