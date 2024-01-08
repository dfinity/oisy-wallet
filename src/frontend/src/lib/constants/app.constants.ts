export const APP_VERSION = VITE_APP_VERSION;

export const MODE = VITE_DFX_NETWORK;
export const LOCAL = MODE === 'local';
export const STAGING = MODE === 'staging';
export const PROD = MODE === 'ic';

export const LOCAL_INTERNET_IDENTITY_CANISTER_ID: string | null | undefined = import.meta.env
	.VITE_INTERNET_IDENTITY_CANISTER_ID as string | null | undefined;

// How long the delegation identity should remain valid?
// e.g. BigInt(60 * 60 * 1000 * 1000 * 1000) = 1 hour in nanoseconds
export const AUTH_MAX_TIME_TO_LIVE = BigInt(60 * 60 * 1000 * 1000 * 1000);

export const AUTH_POPUP_WIDTH = 576;
export const AUTH_POPUP_HEIGHT = 625;

// Workers
export const AUTH_TIMER_INTERVAL = 1000;
export const CODE_TIMER_INTERVAL = 10000;

// Time and dates
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_NON_LEAP_YEAR = 365;

export const NANO_SECONDS_IN_MILLISECOND = 1_000_000;
export const NANO_SECONDS_IN_MINUTE = NANO_SECONDS_IN_MILLISECOND * 1_000 * 60;

// Wallet
export const WALLET_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 2) * 1000; // 30 seconds in milliseconds
export const WALLET_PAGINATION = 10n;
