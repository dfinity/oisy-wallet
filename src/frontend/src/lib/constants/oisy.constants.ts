import metadata from '$env/oisy.metadata.json';
import { z } from 'zod';

const MetadataSchema = z.object({
	OISY_NAME: z.string(),
	OISY_ONELINER: z.string(),
	OISY_DESCRIPTION: z.string(),
	OISY_REPO_URL: z.string().url(),
	OISY_ALPHA_WARNING_URL: z.string().url()
});

const parsedMetadata = MetadataSchema.parse(metadata);

export const OISY_NAME = parsedMetadata.OISY_NAME;
export const OISY_ONELINER = parsedMetadata.OISY_ONELINER;
export const OISY_DESCRIPTION = parsedMetadata.OISY_DESCRIPTION;
export const OISY_URL = import.meta.env.VITE_OISY_URL;
export const OISY_ICON = `${OISY_URL}/favicons/icon-512x512.png`;
export const OISY_REPO_URL = parsedMetadata.OISY_REPO_URL;
export const OISY_ALPHA_WARNING_URL = parsedMetadata.OISY_ALPHA_WARNING_URL;
