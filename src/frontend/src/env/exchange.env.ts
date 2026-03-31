import { LOCAL } from '$lib/constants/app.constants';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EXCHANGE_DISABLED = parseBoolEnvVar(import.meta.env.VITE_EXCHANGE_DISABLED);

export const BACKEND_EXCHANGE_ENABLED = LOCAL;
