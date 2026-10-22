import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';

export type TrackWalletConnectUncheckedSigningParams =
	| { modifier: 'enable' }
	// The refusals the user signed past, which say which reviews are worth teaching OISY to read.
	// Nothing about the transaction itself: no address, amount, data or app.
	| { modifier: 'sign'; network: string; reasons: string[] };

export const trackWalletConnectUncheckedSigning = (
	params: TrackWalletConnectUncheckedSigningParams
) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.WALLET_CONNECT_UNCHECKED_SIGNING,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.WALLET_CONNECT,
			event_modifier: params.modifier,
			...(params.modifier === 'enable'
				? { source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE }
				: {
						event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.REASON,
						event_value: params.reasons.join(','),
						token_network: params.network
					}),
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		}
	});
};
