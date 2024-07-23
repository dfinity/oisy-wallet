// This credential type is defined by the issuer Decide AI
export const POUH_CREDENTIAL_TYPE = 'ProofOfUniqueness';
export const POUH_ENABLED = JSON.parse(import.meta.env.VITE_POUH_ENABLED ?? false) === true;
