import { LOCAL } from '$lib/constants/app.constants';

// There is currently an issue that USDC <=> ckUSDC conversion do not work properly,
// meaning the users will not receive USDC when burning ckUSDC,
// and not receive ckUSDC after sending the USDC.
// Therefore, for the time being, we disable the ckUSDC operations in non-local envs.
export const CK_USDC_CONVERSION_ENABLED = LOCAL;
