import { browser } from '$app/environment';
import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ENABLED } from '$env/plausible.env';
import { TRACK_OPEN_DOCUMENTATION } from '$lib/constants/analytics.constants';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	type PLAUSIBLE_EVENT_FILTER_MODIFIERS,
	type PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_SUBCONTEXT_BACKEND,
	type PLAUSIBLE_EVENT_TRIGGERS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import en from '$lib/i18n/en.json';
import { loadPlausibleTracker } from '$lib/services/analytics-wrapper';
import type { TrackEventParams } from '$lib/types/analytics';
import type { RateLimitInfo } from '$lib/types/api';
import { consoleWarn } from '$lib/utils/console.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
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
		// Non-critical: tracking failure should not prevent the continuation of the user flow.

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

/**
 * Track a single transaction-filter change emitted from the activity page.
 *
 * Centralises the payload so the type / token / contact toggles and the
 * "clear" action all show up under one Plausible event with the same shape:
 *
 * - `event_modifier`: `set` / `unset` for toggles, `clear` for the bulk reset.
 * - `event_key`: `transaction_type` / `token` / `contact`. Omitted for `clear`.
 * - For transaction types: `event_value` carries the type (e.g. `send`).
 * - For tokens: instead of `event_value` we emit dedicated `token_*` props
 *   (network / address / symbol / name) so dashboards can group cleanly.
 * - For contacts we deliberately ship no value to avoid leaking PII (custom
 *   names / ids) to analytics; `event_modifier` already tells us whether the
 *   user added or removed a contact filter.
 */
export const trackTransactionFilter = ({
	modifier,
	key,
	value,
	token
}: {
	modifier: PLAUSIBLE_EVENT_FILTER_MODIFIERS;
	key?: PLAUSIBLE_EVENT_EVENTS_KEYS;
	value?: string;
	token?: { network: string; address: string; symbol: string; name: string };
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TRANSACTION_FILTER,
		metadata: {
			event_modifier: modifier,
			...(nonNullish(key) && { event_key: key }),
			...(nonNullish(value) && { event_value: value }),
			...(nonNullish(token) && {
				token_network: token.network,
				token_address: token.address,
				token_symbol: token.symbol,
				token_name: token.name
			}),
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.ACTIVITY_PAGE,
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		}
	});
};

/**
 * Track the outcome of opening the Onramper buy widget.
 *
 * Fired once the open outcome is known: `success` when the signed widget URL
 * resolves, `error` when signing fails. Replaces the former buy-token event.
 *
 * Mirrors {@link trackTransactionFilter}: the selected token is emitted via the
 * dedicated `token_*` props (network / symbol / name / address) so dashboards
 * can group cleanly. On failure we additionally carry the error severity, the
 * failure category (`result_error_type`) and the underlying message, if any.
 */
export const trackOnramperOpen = ({
	token,
	status,
	errorType,
	errorMessage
}: {
	token?: { network: string; symbol: string; name: string; address?: string };
	status: PLAUSIBLE_EVENT_RESULT_STATUSES;
	errorType?: PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES;
	errorMessage?: string;
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.ONRAMPER_OPEN,
		metadata: {
			...(nonNullish(token) && {
				token_network: token.network,
				token_symbol: token.symbol,
				token_name: token.name,
				...(nonNullish(token.address) && { token_address: token.address })
			}),
			result_status: status,
			...(status === PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR && {
				result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR,
				...(nonNullish(errorType) && { result_error_type: errorType }),
				...(nonNullish(errorMessage) && { result_error_message: errorMessage })
			})
		}
	});
};

/**
 * Resolve a dot-path i18n key against the bundled English locale and expand
 * OISY placeholders (e.g. `$oisy_short` → `OISY`). Always English, regardless
 * of the user's locale, so analytics dashboards stay consistent. Returns
 * `undefined` if the key cannot be resolved or does not point at a string.
 */
const resolveEnglishLabel = (key: string): string | undefined => {
	const value = key
		.split('.')
		.reduce<unknown>(
			(acc, segment) =>
				typeof acc === 'object' && nonNullish(acc)
					? (acc as Record<string, unknown>)[segment]
					: undefined,
			en
		);

	return typeof value === 'string' ? replaceOisyPlaceholders(value) : undefined;
};

/**
 * Build a `TrackEventParams` payload for a "Learn more" documentation link click.
 *
 * Returns the params object rather than firing the event so callers can pass it
 * straight to `ExternalLink.trackEvent`, which fires on click. Centralising the
 * payload keeps the thirteen UI usage sites in sync with the schema.
 *
 * Emits a derived `source_path` field — a slash-joined identity
 * (`<source_location> / <source_sublocation?> / <English label>`) intended
 * for at-a-glance dashboard scanning. Filtering and grouping should still
 * use the discrete `source_location` / `source_sublocation` fields.
 */
export const buildLearnMoreEvent = ({
	sourceLocation,
	sourceSublocation,
	labelKey,
	url
}: {
	sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS;
	sourceSublocation?: string;
	labelKey: string;
	url: string;
}): TrackEventParams => {
	const label = resolveEnglishLabel(labelKey);
	const source_path = [sourceLocation, sourceSublocation, label].filter(nonNullish).join(' / ');

	return {
		name: TRACK_OPEN_DOCUMENTATION,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.LEARN_MORE,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.LINK,
			event_value: url,
			source_location: sourceLocation,
			...(nonNullish(sourceSublocation) && { source_sublocation: sourceSublocation }),
			source_path
		}
	};
};

/**
 * Build a `view_open` payload for an Assets sub-tab impression (Tokens / NFTs / Earning).
 *
 * Returns the params rather than firing so the two call sites stay byte-identical:
 * a deliberate tab click in `Tabs.handleClick` (`trigger = click`) and the landing-tab
 * impression fired on entering the Assets section (`trigger = auto`). The only fields
 * that vary between them are `event_value` (the tab id) and `event_trigger`.
 */
export const buildAssetsTabViewEvent = ({
	tabId,
	trigger
}: {
	tabId: string;
	trigger: PLAUSIBLE_EVENT_TRIGGERS;
}): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.VIEW_OPEN,
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS_TAB,
		event_value: tabId,
		location_source: PLAUSIBLE_EVENT_SOURCES.ASSETS_PAGE,
		event_trigger: trigger
	}
});

/**
 * Build a generic `ui_click` payload for a navigation interaction.
 *
 * Returns the params so callers can hand it to an element's click-tracking prop
 * (e.g. `NavigationItem.trackEvent`) rather than firing directly. One generic event
 * with a `source_location` ladder — rather than per-surface event names — keeps every
 * navigation surface comparable in a single Plausible breakdown. Uses the standard
 * `source_location` key (not the legacy `location_source`).
 */
export const buildUiClickEvent = ({
	sourceLocation,
	sourceSublocation,
	eventValue
}: {
	sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS;
	sourceSublocation?: string;
	eventValue?: string;
}): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.UI_CLICK,
	metadata: {
		source_location: sourceLocation,
		...(nonNullish(sourceSublocation) && { source_sublocation: sourceSublocation }),
		...(nonNullish(eventValue) && { event_value: eventValue })
	}
});
