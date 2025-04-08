import metadata from '$env/oisy.metadata.json';
import { OisyMetadataSchema } from '$env/schema/env-oisy-metadata.schema';
import { safeParse } from '$lib/validation/utils.validation';

export const {
	OISY_SHORT,
	OISY_NAME,
	OISY_ONELINER,
	OISY_DESCRIPTION,
	OISY_REPO_URL,
	OISY_TWITTER_URL,
	OISY_DOCS_URL,
	OISY_SUPPORT_URL,
	OISY_REWARDS_URL,
	OISY_REFERRAL_URL,
	OISY_REFERRAL_TWITTER_URL
} = safeParse({
	schema: OisyMetadataSchema,
	value: metadata,
	fallback: {
		OISY_SHORT: '',
		OISY_NAME: '',
		OISY_ONELINER: '',
		OISY_DESCRIPTION: '',
		OISY_REPO_URL: '',
		OISY_TWITTER_URL: '',
		OISY_DOCS_URL: '',
		OISY_SUPPORT_URL: '',
		OISY_REWARDS_URL: '',
		OISY_REFERRAL_URL: '',
		OISY_REFERRAL_TWITTER_URL: ''
	}
});

export const OISY_URL = import.meta.env.OISY_IC_DOMAIN;
export const OISY_ICON = `${OISY_URL}/favicons/icon-512x512.png`;
