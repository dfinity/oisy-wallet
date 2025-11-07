import { browser } from '$app/environment';
import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import { loadPlausibleTracker } from '$lib/services/analytics-wrapper';
import type { TrackEventParams } from '$lib/types/analytics';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { init, track } from '@plausible-analytics/tracker';

let plausibleTracker: { init: typeof init; track: typeof track } | undefined = undefined;
let plausibleTrackerIsInitialized = false;

export const initPlausibleAnalytics = async () => {
	if (
		!PLAUSIBLE_ENABLED ||
		isNullish(PLAUSIBLE_DOMAIN) ||
		!browser ||
		plausibleTrackerIsInitialized
	) {
		return;
	}

	// Note: This module must be imported in the browser only.
	// The latest version of @plausible-analytics/tracker does not work in server (SSR) mode.
	// Reference: https://www.npmjs.com/package/@plausible-analytics/tracker
	// Important: This library only works in browser environments. The `init` and `track`
	// functions rely on browser APIs, so they should only be initialized and called on the client side.
	try {
		plausibleTracker = await loadPlausibleTracker();

		plausibleTracker.init({
			domain: PLAUSIBLE_DOMAIN
		});
		plausibleTrackerIsInitialized = true;
	} catch (_: unknown) {
		console.warn('An unexpected error occurred during initialization.');
		plausibleTracker = undefined;
		plausibleTrackerIsInitialized = false;
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
	if (PLAUSIBLE_ENABLED && nonNullish(plausibleTracker) && plausibleTrackerIsInitialized) {
		// Important: This library only works in browser environments. The `init` and `track`
		// functions rely on browser APIs, so they should only be initialized and called on the client side.

		plausibleTracker.track(name, { props: metadata });

		if (nonNullish(warning)) {
			// We print the error to console just for debugging purposes
			console.warn(warning);
		}
	}
};
