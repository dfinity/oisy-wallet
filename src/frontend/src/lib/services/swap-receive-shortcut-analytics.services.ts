import { isTokenErc } from '$eth/utils/erc.utils';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Token } from '$lib/types/token';
import { getTokenIdentifier } from '$lib/utils/identifier.utils';
import { nonNullish } from '@dfinity/utils';

// What was used, carried in `event_modifier`: one of the three shortcuts.
export type SwapReceiveShortcutAction = 'same_network' | 'other_network' | 'any_token';

export interface TrackSwapReceiveShortcutParams {
	action: SwapReceiveShortcutAction;
	sourceToken: Token;
	// The receive token, when the use picked one: a network in "Move <symbol> to", or the one network a
	// shortcut sets directly.
	destinationToken?: Token;
}

const analyticsTokenAddress = (token: Token): string | undefined => {
	const address = getTokenIdentifier(token);

	return isTokenErc(token) ? address?.toLowerCase() : address;
};

// The pay token and the picked one are public chain data; no amount is sent.
export const trackSwapReceiveShortcut = ({
	action,
	sourceToken,
	destinationToken
}: TrackSwapReceiveShortcutParams) => {
	const sourceAddress = analyticsTokenAddress(sourceToken);
	const destinationAddress = nonNullish(destinationToken)
		? analyticsTokenAddress(destinationToken)
		: undefined;

	trackEvent({
		name: PLAUSIBLE_EVENTS.SWAP_RECEIVE_SHORTCUT,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
			event_modifier: action,
			token_symbol: sourceToken.symbol,
			token_network: sourceToken.network.name,
			token_name: sourceToken.name,
			token_standard: sourceToken.standard.code,
			...(nonNullish(sourceAddress) && { token_address: sourceAddress }),
			...(nonNullish(destinationToken) && {
				token2_symbol: destinationToken.symbol,
				token2_network: destinationToken.network.name,
				token2_name: destinationToken.name,
				token2_standard: destinationToken.standard.code,
				...(nonNullish(destinationAddress) && { token2_address: destinationAddress })
			}),
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		}
	});
};
