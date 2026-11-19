import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SUBCONTEXT_NETWORKS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';

/**
 * The `error` event reports an invariant we believed unreachable. A flow that can legitimately
 * fail keeps its own event and reports the outcome through `result_status` instead — otherwise
 * `error` becomes a catch-all, fires constantly, and stops being worth alerting on.
 *
 * Every helper here must set `result_error_severity`, so the volume can be read by impact.
 */

const reportedNetworkSettingsKeys = new Set<string>();

/**
 * A `NetworkSettingsFor` key the backend persisted that this frontend has no `NetworkId` for.
 * The setting is ignored and every other network still maps, so the user notices nothing.
 *
 * Reported once per key per session. The callers run repeatedly — the profile is decoded on every
 * load and the settings store is a derived that recomputes on every write — but the signal is
 * that the key exists, not how many times we looked at it.
 */
export const trackUnmappedNetworkSettingsKey = ({ key }: { key: string }) => {
	if (reportedNetworkSettingsKeys.has(key)) {
		return;
	}

	reportedNetworkSettingsKeys.add(key);

	trackEvent({
		name: PLAUSIBLE_EVENTS.ERROR,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.NETWORKS,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NETWORKS.SETTINGS_KEY_UNMAPPED,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
			event_value: key,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MINOR
		}
	});
};
