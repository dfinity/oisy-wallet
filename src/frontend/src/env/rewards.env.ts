// TODO: to be removed when the feature is fully implemented
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const REWARDS_ENABLED = parseBoolEnvVar(import.meta.env.VITE_AIRDROPS_ENABLED);
