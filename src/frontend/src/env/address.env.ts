import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const FRONTEND_DERIVATION_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_DERIVATION_ENABLED
);
