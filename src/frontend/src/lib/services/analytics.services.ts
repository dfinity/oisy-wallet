import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import type { TrackEventParams } from '$lib/types/analytics';
import { isNullish, nonNullish } from '@dfinity/utils';
import Plausible from 'plausible-tracker';

let plausibleTracker: ReturnType<typeof Plausible> | null = null;

export const initPlausibleAnalytics = () => {
	if (!PLAUSIBLE_ENABLED || isNullish(PLAUSIBLE_DOMAIN)) {
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

export const trackEvent = ({ name, metadata, warning }: TrackEventParams) => {
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

		if (nonNullish(warning)) {
			// We print the error to console just for debugging purposes
			console.warn(warning);
		}
	}
};
