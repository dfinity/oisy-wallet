import { LOCAL } from '$lib/constants/app.constants';
import { initOrbiter } from '@junobuild/analytics';

export const initAnalytics = async () => {
	if (LOCAL) {
		return;
	}

	const SATELLITE_ID = import.meta.env.VITE_JUNO_SATELLITE_ID;
	const ORBITER_ID = import.meta.env.VITE_JUNO_ORBITER_ID;

	await initOrbiter({
		satelliteId: SATELLITE_ID,
		orbiterId: ORBITER_ID
	});
};
