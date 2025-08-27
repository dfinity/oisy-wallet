import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const NEW_AGREEMENTS_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_NEW_AGREEMENTS_ENABLED
);
