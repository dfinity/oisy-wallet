import { z } from 'zod';

export const oisyMetadata = z.object({
	OISY_SHORT: z.string(),
	OISY_NAME: z.string(),
	OISY_ONELINER: z.string(),
	OISY_DESCRIPTION: z.string(),
	OISY_REPO_URL: z.string().url(),
	OISY_ALPHA_WARNING_URL: z.string().url(),
	OISY_TWITTER_URL: z.string().url()
});
