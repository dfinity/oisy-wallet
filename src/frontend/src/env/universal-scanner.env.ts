// TODO: to be removed when the feature is fully implemented
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const UNIVERSAL_SCANNER_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_UNIVERSAL_SCANNER_ENABLED
);
