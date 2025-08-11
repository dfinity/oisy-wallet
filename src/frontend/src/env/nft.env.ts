import { parseBoolEnvVar } from '$lib/utils/env.utils';

// TODO: remove once the feature has been completed
export const NFTS_ENABLED = parseBoolEnvVar(import.meta.env.VITE_NFTS_ENABLED);
