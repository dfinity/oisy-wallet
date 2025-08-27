import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const VELORA_SWAP_ENABLED = parseBoolEnvVar(import.meta.env.VITE_VELORA_SWAP_ENABLED);
