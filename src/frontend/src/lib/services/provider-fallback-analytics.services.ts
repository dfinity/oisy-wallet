import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';

// Why the second provider was asked, carried in `event_trigger`: the first one answered with an
// error, or did not answer within the time it was given.
export type ProviderFallbackTrigger = 'error' | 'timeout';

export interface TrackProviderFallbackParams {
	// The call that was handed over → `event_subcontext`.
	operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS;
	trigger: ProviderFallbackTrigger;
	// The network the call was for → `event_key: network` + `event_value`.
	network: string;
	// Whether the second provider delivered → `result_status`: `success` or `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
}

// One structured `provider_fallback` event for every call a send hands to a second provider, so
// that we learn how often the first one fails us, on which call and network, and whether asking
// again helped.
//
// Privacy: the event never carries the address, the transaction hash or an amount. Each would tie
// the event to one wallet (invariant 3 in docs/ai/frontend/analytics.md), and the question it
// answers needs none of them.
export const trackProviderFallback = ({
	operation,
	trigger,
	network,
	resultStatus
}: TrackProviderFallbackParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.PROVIDER_FALLBACK,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.PROVIDERS,
			event_subcontext: operation,
			event_trigger: trigger,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
			event_value: network,
			result_status: resultStatus
		}
	});
};
