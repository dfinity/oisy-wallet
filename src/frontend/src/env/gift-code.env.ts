import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const GIFT_CODE_MOCK_ENABLED = parseBoolEnvVar(import.meta.env.VITE_GIFT_CODE_MOCK_ENABLED);
