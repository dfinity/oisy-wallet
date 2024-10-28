import metadata from '$env/oisy.metadata.json';
import { oisyMetadata } from '$env/types/env-oisy-metadata';

const parsedMetadata = oisyMetadata.safeParse(metadata);

export const {
	OISY_SHORT,
	OISY_NAME,
	OISY_ONELINER,
	OISY_DESCRIPTION,
	OISY_REPO_URL,
	OISY_ALPHA_WARNING_URL
} = parsedMetadata.success
	? parsedMetadata.data
	: {
			OISY_SHORT: '',
			OISY_NAME: '',
			OISY_ONELINER: '',
			OISY_DESCRIPTION: '',
			OISY_REPO_URL: '',
			OISY_ALPHA_WARNING_URL: ''
		};

export const OISY_URL = import.meta.env.VITE_OISY_URL;
export const OISY_ICON = `${OISY_URL}/favicons/icon-512x512.png`;

// TODO: Adjust the URL when we remove the Alpha warning
export const OISY_STATUS_URL = OISY_ALPHA_WARNING_URL;
