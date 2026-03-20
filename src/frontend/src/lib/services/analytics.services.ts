import { browser } from '$app/environment';
import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_SUBCONTEXT_BACKEND,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { loadPlausibleTracker } from '$lib/services/analytics-wrapper';
import type { TrackEventParams } from '$lib/types/analytics';
import type { RateLimitInfo } from '$lib/types/api';
import { consoleWarn } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { init, track } from '@plausible-analytics/tracker';

let plausibleTracker: { init: typeof init; track: typeof track } | undefined = undefined;

export const initPlausibleAnalytics = async () => {
	if (
		!PLAUSIBLE_ENABLED ||
		isNullish(PLAUSIBLE_DOMAIN) ||
		!browser ||
		nonNullish(plausibleTracker)
	) {
		return;
	}

	// Note: This module must be imported in the browser only.
	// The latest version of @plausible-analytics/tracker does not work in server (SSR) mode.
	// Reference: https://www.npmjs.com/package/@plausible-analytics/tracker
	// Important: This library only works in browser environments. The `init` and `track`
	// functions rely on browser APIs, so they should only be initialized and called on the client side.
	try {
		const tracker = await loadPlausibleTracker();

		tracker.init({
			domain: PLAUSIBLE_DOMAIN
		});

		plausibleTracker = tracker;
	} catch (_: unknown) {
		consoleWarn('An unexpected error occurred during initialization.');
		plausibleTracker = undefined;
	}
};

/**
 * Sends an analytics event to Plausible. Wrapped in a try/catch so that any tracking
 * failure is silently swallowed — analytics are non-critical and must never interrupt
 * the user flow or propagate errors to callers.
 *
 * @param params.name - The Plausible event name to track.
 * @param params.metadata - Optional key/value properties attached to the event.
 * @param params.warning - Optional warning message logged via {@link consoleWarn} after the event is sent.
 */
export const trackEvent = ({ name, metadata, warning }: TrackEventParams) => {
	try {
		/**
		 * We use the `PLAUSIBLE_ENABLED` feature flag to allow flexibility in enabling or disabling
		 * analytics in specific builds. This ensures that analytics
		 * can be disabled even in production-like environments during testing.
		 *
		 * TODO: Once testing is complete and Plausible should only run in production,
		 * replace the `PLAUSIBLE_ENABLED` check with a `PROD` check and remove the feature flag.
		 */
		if (PLAUSIBLE_ENABLED && nonNullish(plausibleTracker)) {
			// Important: This library only works in browser environments. The `init` and `track`
			// functions rely on browser APIs, so they should only be initialized and called on the client side.

			plausibleTracker.track(name, { props: metadata });

			if (nonNullish(warning)) {
				consoleWarn(warning);
			}
		}
	} catch (err: unknown) {
		if (LOCAL || STAGING) {
			// eslint-disable-next-line no-console
			console.debug('[analytics]', err);
		}
	}
};

export const trackRateLimited = ({ endpoint, limiter }: RateLimitInfo) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.RATE_LIMITED,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.BACKEND,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_BACKEND.PER_USER,
			location_source: PLAUSIBLE_EVENT_SOURCES.BACKEND,
			endpoint,
			limiter
		}
	});
};
