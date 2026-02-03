import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const OCP_PAY_WITH_BTC_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_OCP_PAY_WITH_BTC_ENABLED
);
