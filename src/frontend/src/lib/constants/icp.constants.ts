import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

export const SYNC_ICP_WALLET_TIMER_INTERVAL_MILLIS = (SECONDS_IN_MINUTE / 2) * 1000; // 30 seconds in milliseconds

export const ICP_WALLET_PAGINATION = 10n;
