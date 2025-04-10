import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import { BETA, LOCAL, PROD, STAGING, TEST_FE } from '$lib/constants/app.constants';
import type { TrackEventParams } from '$lib/types/analytics';
import { isNullish, nonNullish } from '@dfinity/utils';
import { initOrbiter, trackEvent as trackEventOrbiter } from '@junobuild/analytics';
import Plausible from 'plausible-tracker';

let plausibleTracker: ReturnType<typeof Plausible> | null = null;

export const initAnalytics = async () => {
	/**
	 * TODO: Remove Juno analytics entirely once Plausible is the sole tracking solution.
	 * Currently, we disable Juno on all environments (PROD, BETA, STAGING, etc.) to avoid conflicts.
	 */
	if (PROD || BETA || STAGING || LOCAL || TEST_FE) {
		return;
	}

	const SATELLITE_ID = import.meta.env.VITE_JUNO_SATELLITE_ID;
	const ORBITER_ID = import.meta.env.VITE_JUNO_ORBITER_ID;

	if (isNullish(SATELLITE_ID) || isNullish(ORBITER_ID)) {
		return;
	}

	await initOrbiter({
		satelliteId: SATELLITE_ID,
		orbiterId: ORBITER_ID,
		options: {
			performance: false
		},
		worker: {
			path: '/workers/analytics.worker.js'
		}
	});
};

export const initPlausibleAnalytics = () => {
	if (!PLAUSIBLE_ENABLED) {
		return;
	}

	try {
		if (isNullish(plausibleTracker)) {
			plausibleTracker = Plausible({
				domain: PLAUSIBLE_DOMAIN,
				hashMode: false,
				trackLocalhost: false
			});
			plausibleTracker.enableAutoPageviews();
		}
	} catch (_err: unknown) {
		console.warn('An unexpected error occurred during initialization.');
	}
};

export const trackEvent = async ({ name, metadata }: TrackEventParams) => {
	/**
	 * We use the `PLAUSIBLE_ENABLED` feature flag to allow flexibility in enabling or disabling
	 * analytics in specific builds. This ensures that analytics
	 * can be disabled even in production-like environments during testing.
	 *
	 * TODO: Once testing is complete and Plausible should only run in production,
	 * replace the `PLAUSIBLE_ENABLED` check with a `PROD` check and remove the feature flag.
	 */
	if (PLAUSIBLE_ENABLED && nonNullish(plausibleTracker)) {
		plausibleTracker.trackEvent(name, { props: metadata });
	}

	/**
	 * TODO: Remove Juno analytics entirely once Plausible is the sole tracking solution.
	 * Currently, we disable Juno on all environments (PROD, BETA, STAGING, etc.) to avoid conflicts.
	 */
	if (PROD || BETA || STAGING || LOCAL || TEST_FE) {
		return;
	}

	await trackEventOrbiter({
		name,
		metadata
	});
};
