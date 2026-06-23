import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';

// Mock mode is ON by default for testing. Set VITE_GIFT_CODE_MOCK_DISABLED=true to use real canister calls.
export const GIFT_CODE_MOCK_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_GIFT_CODE_MOCK_DISABLED
);
