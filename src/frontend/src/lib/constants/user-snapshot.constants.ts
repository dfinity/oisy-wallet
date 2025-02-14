import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

// Taking a snapshot automatically ever interval
export const SYNC_USER_SNAPSHOT_TIMER_INTERVAL = SECONDS_IN_MINUTE * 1000 * 5; // 5 minutes
