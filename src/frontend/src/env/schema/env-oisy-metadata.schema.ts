import * as z from 'zod/v4';

export const OisyMetadataSchema = z.object({
	OISY_SHORT: z.string(),
	OISY_NAME: z.string(),
	OISY_ONELINER: z.string(),
	OISY_DESCRIPTION: z.string(),
	OISY_REPO_URL: z.url(),
	OISY_TWITTER_URL: z.url(),
	OISY_DOCS_URL: z.url(),
	OISY_AI_ASSISTANT_DOCS_URL: z.url(),
	OISY_SUPPORT_URL: z.url(),
	OISY_REWARDS_URL: z.url(),
	OISY_REFERRAL_URL: z.url(),
	OISY_WELCOME_TWITTER_URL: z.url(),
	OISY_INTERNET_IDENTITY_URL: z.url(),
	OISY_FIND_INTERNET_IDENTITY_URL: z.url(),
	OISY_FAQ_URL: z.url(),
	OISY_ACCESS_CONTROL_URL: z.url()
});
