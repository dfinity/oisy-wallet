import { LOCAL } from '$lib/constants/app.constants';
import { isNullish } from '@dfinity/utils';
import { initOrbiter, trackEvent as trackEventOrbiter } from '@junobuild/analytics';

export const initAnalytics = async () => {
	if (LOCAL) {
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

export const trackEvent = async ({
	name,
	metadata
}: {
	name: string;
	metadata?: Record<string, string>;
}) => {
	if (LOCAL) {
		return;
	}

	await trackEventOrbiter({
		name,
		metadata
	});
};
