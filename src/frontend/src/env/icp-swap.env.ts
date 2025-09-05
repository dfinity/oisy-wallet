import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const ICP_SWAP_ENABLED = parseBoolEnvVar(import.meta.env.VITE_ICP_SWAP_ENABLED);
