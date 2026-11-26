import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const LIQUIDIUM_ENABLED = true;

// Liquidium's SOL pool, offered while its rails are built and verified on staging. It also needs
// ckSOL in the build (see `isLiquidiumAssetSupported`), which local builds don't have.
export const LIQUIDIUM_SOL_ENABLED = LOCAL || STAGING;
