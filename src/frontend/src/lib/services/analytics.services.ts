import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import { PROD } from '$lib/constants/app.constants';
import type { TrackEventParams } from '$lib/types/analytics';
import { isNullish, nonNullish } from '@dfinity/utils';
import { initOrbiter, trackEvent as trackEventOrbiter } from '@junobuild/analytics';
import Plausible from 'plausible-tracker';

let plausibleTracker: ReturnType<typeof Plausible> | null = null;

export const initAnalytics = async () => {
	if (!PROD) {
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

	if (isNullish(plausibleTracker)) {
		plausibleTracker = Plausible({
			domain: PLAUSIBLE_DOMAIN,
			hashMode: false,
			trackLocalhost: false
		});
		plausibleTracker.enableAutoPageviews();
	}
};

export const trackEvent = async ({ name, metadata }: TrackEventParams) => {
	/**
	 * We use the `PLAUSIBLE_ENABLED` feature flag instead of relying solely on `PROD`
	 * to allow more flexibility—for example, disabling analytics in certain production builds.
	 *
	 * This is temporary and can be removed once testing is complete and Plausible
	 * should only run in production.
	 */
	if (PLAUSIBLE_ENABLED && nonNullish(plausibleTracker)) {
		plausibleTracker.trackEvent(name, { props: metadata });
	}

	if (!PROD) {
		return;
	}

	await trackEventOrbiter({
		name,
		metadata
	});
};
