import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';

// What happened to the hint, carried in `event_modifier`: it showed, or its button was pressed.
export type SwapTwoSwapsHintAction = 'show' | 'click';

export interface TrackSwapTwoSwapsHintParams {
	action: SwapTwoSwapsHintAction;
	// The provider whose route named the in-between token → `event_provider`.
	provider: SwapProvider;
	sourceToken: Token;
	destinationToken: Token;
	// The token of the two separate swaps → `event_key: token` + `event_value`, and its network →
	// `event_key2: network` + `event_value2`.
	intermediateToken: Token;
}

// The pair and the in-between token are public chain data; no amount is sent.
export const trackSwapTwoSwapsHint = ({
	action,
	provider,
	sourceToken,
	destinationToken,
	intermediateToken
}: TrackSwapTwoSwapsHintParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.SWAP_TWO_SWAPS_HINT,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
			event_provider: provider,
			event_modifier: action,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
			event_value: intermediateToken.symbol,
			event_key2: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
			event_value2: intermediateToken.network.name,
			token_symbol: sourceToken.symbol,
			token_network: sourceToken.network.name,
			token_name: sourceToken.name,
			token_standard: sourceToken.standard.code,
			token_id: String(sourceToken.id),
			token2_symbol: destinationToken.symbol,
			token2_network: destinationToken.network.name,
			token2_name: destinationToken.name,
			token2_standard: destinationToken.standard.code,
			token2_id: String(destinationToken.id),
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		}
	});
};
