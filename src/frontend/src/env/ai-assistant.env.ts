// TODO: to be removed when the feature is fully implemented
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const AI_ASSISTANT_CONSOLE_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_AI_ASSISTANT_CONSOLE_ENABLED
);
