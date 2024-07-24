import { nonNullish } from '@dfinity/utils';

export const APP_VERSION = VITE_APP_VERSION;

export const MODE = VITE_DFX_NETWORK;
export const LOCAL = MODE === 'local';
export const STAGING = MODE === 'staging';
export const PROD = MODE === 'ic';

const MAINNET_DOMAIN = 'icp0.io';

export const INTERNET_IDENTITY_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_INTERNET_IDENTITY_CANISTER_ID
	: undefined;

export const INTERNET_IDENTITY_ORIGIN = LOCAL
	? `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`
	: 'https://identity.ic0.app';

export const POUH_ISSUER_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_POUH_ISSUER_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_POUH_ISSUER_CANISTER_ID
		: PROD
			? import.meta.env.VITE_IC_POUH_ISSUER_CANISTER_ID
			: undefined;

export const POUH_ISSUER_ORIGIN = nonNullish(POUH_ISSUER_CANISTER_ID)
	? LOCAL
		? `http://${POUH_ISSUER_CANISTER_ID}.localhost:4943`
		: `https://${POUH_ISSUER_CANISTER_ID}.${MAINNET_DOMAIN}`
	: undefined;

export const BACKEND_CANISTER_ID = LOCAL
	? import.meta.env.VITE_LOCAL_BACKEND_CANISTER_ID
	: STAGING
		? import.meta.env.VITE_STAGING_BACKEND_CANISTER_ID
		: import.meta.env.VITE_IC_BACKEND_CANISTER_ID;

// How long the delegation identity should remain valid?
// e.g. BigInt(60 * 60 * 1000 * 1000 * 1000) = 1 hour in nanoseconds
export const AUTH_MAX_TIME_TO_LIVE = BigInt(60 * 60 * 1000 * 1000 * 1000);

export const AUTH_ALTERNATIVE_ORIGINS = import.meta.env.VITE_AUTH_ALTERNATIVE_ORIGINS;
export const AUTH_DERIVATION_ORIGIN = import.meta.env.VITE_AUTH_DERIVATION_ORIGIN;

export const AUTH_POPUP_WIDTH = 576;
export const AUTH_POPUP_HEIGHT = 625;
export const VC_POPUP_WIDTH = AUTH_POPUP_WIDTH;
// Screen to allow credential presentation is longer than the authentication screen.
export const VC_POPUP_HEIGHT = 900;

// Workers
export const AUTH_TIMER_INTERVAL = 1000;

// Date and time
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_NON_LEAP_YEAR = 365;

export const NANO_SECONDS_IN_MILLISECOND = 1_000_000n;
export const NANO_SECONDS_IN_MINUTE = NANO_SECONDS_IN_MILLISECOND * 1_000n * 60n;

// For some use case we want to display some amount to a maximal number of decimals which is not related to the number of decimals of the selected token.
// Just a value that looks good visually.
export const EIGHT_DECIMALS = 8;
