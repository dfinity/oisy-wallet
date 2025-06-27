import { parseBoolEnvVar } from '$lib/utils/env.utils';

// TODO: to be removed when the feature is fully implemented
export const FRONTEND_DERIVATION_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_DERIVATION_ENABLED
);
