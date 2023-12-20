export const APP_VERSION = VITE_APP_VERSION;

export const MODE = VITE_DFX_NETWORK;
export const LOCAL = MODE === 'local';
export const STAGING = MODE === 'staging';
export const PROD = MODE === 'ic';

export const LOCAL_INTERNET_IDENTITY_CANISTER_ID: string | null | undefined = import.meta.env
	.VITE_INTERNET_IDENTITY_CANISTER_ID as string | null | undefined;

export const ICP_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_ICP_LEDGER_CANISTER_ID as string | null | undefined) ??
	'yjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(import.meta.env.VITE_ICP_INDEX_CANISTER_ID as string | null | undefined) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';

// How long the delegation identity should remain valid?
// e.g. BigInt(60 * 60 * 1000 * 1000 * 1000) = 1 hour in nanoseconds
export const AUTH_MAX_TIME_TO_LIVE = BigInt(60 * 60 * 1000 * 1000 * 1000);

export const AUTH_POPUP_WIDTH = 576;
export const AUTH_POPUP_HEIGHT = 625;

// Workers
export const AUTH_TIMER_INTERVAL = 1000;
export const CODE_TIMER_INTERVAL = 10000;

export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_NON_LEAP_YEAR = 365;
