// This credential type is defined by the issuer Decide AI
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const POUH_CREDENTIAL_TYPE = 'ProofOfUniqueness';
export const POUH_ENABLED = parseBoolEnvVar(import.meta.env.VITE_POUH_ENABLED);
