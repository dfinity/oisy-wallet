import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EXCHANGE_DISABLED = parseBoolEnvVar(import.meta.env.VITE_EXCHANGE_DISABLED);

export const TEST_ENV_VAR = parseBoolEnvVar(import.meta.env.VITE_TEST_ENV_VAR);
