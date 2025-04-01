import * as z from 'zod';

export const OisyMetadataSchema = z.object({
	OISY_SHORT: z.string(),
	OISY_NAME: z.string(),
	OISY_ONELINER: z.string(),
	OISY_DESCRIPTION: z.string(),
	OISY_REPO_URL: z.string().url(),
	OISY_TWITTER_URL: z.string().url(),
	OISY_DOCS_URL: z.string().url(),
	OISY_SUPPORT_URL: z.string().url(),
	OISY_REWARDS_URL: z.string().url(),
	OISY_REFERRAL_URL: z.string().url(),
	OISY_REFERRAL_TWITTER_URL: z.string().url()
});
