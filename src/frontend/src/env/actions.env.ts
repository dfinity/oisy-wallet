// TODO: to be removed when the feature is fully implemented
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const SWAP_ACTION_ENABLED = parseBoolEnvVar(import.meta.env.VITE_SWAP_ACTION_ENABLED);
