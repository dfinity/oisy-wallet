import { PLAUSIBLE_DOMAIN } from '$env/plausible.env';
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
	if (!PROD) {
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
	if (!PROD) {
		return;
	}

	if (nonNullish(plausibleTracker)) {
		plausibleTracker.trackEvent(name, { props: metadata });
	}

	await trackEventOrbiter({
		name,
		metadata
	});
};
