import metadata from '$env/oisy.metadata.json';
import { oisyMetadata } from '$env/types/env-oisy-metadata';
import { safeParse } from '$lib/validation/utils.validation';

export const {
	OISY_SHORT,
	OISY_NAME,
	OISY_ONELINER,
	OISY_DESCRIPTION,
	OISY_REPO_URL,
	OISY_STATUS_URL,
	OISY_TWITTER_URL
} = safeParse({
	schema: oisyMetadata,
	value: metadata,
	fallback: {
		OISY_SHORT: '',
		OISY_NAME: '',
		OISY_ONELINER: '',
		OISY_DESCRIPTION: '',
		OISY_REPO_URL: '',
		OISY_STATUS_URL: '',
		OISY_TWITTER_URL: ''
	}
});

export const OISY_URL = import.meta.env.VITE_OISY_URL;
export const OISY_ICON = `${OISY_URL}/favicons/icon-512x512.png`;
