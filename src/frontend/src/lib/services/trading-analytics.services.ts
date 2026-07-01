import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import { nonNullish, notEmptyString } from '@dfinity/utils';

export interface TrackTradingParams {
	// Which trading flow the event belongs to (limit order / cancel / deposit / withdraw).
	subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING;
	// Lifecycle: `executing` when the flow starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	base?: string;
	quote?: string;
	side?: LimitOrderSide;
	orderType?: string;
	token?: string;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the whole Trading feature, mirroring `trackTokenManage`:
// the flow is the `event_subcontext`, the lifecycle the `result_status`, so every
// deposit/withdraw/limit-order/cancel situation is one `trading` event distinguished
// by metadata rather than a bespoke event name per action+state.
export const trackTrading = ({
	subContext,
	resultStatus,
	base,
	quote,
	side,
	orderType,
	token,
	error
}: TrackTradingParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TRADING,
		metadata: {
			dApp: OISY_TRADE_PROVIDER_NAME,
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRADING,
			event_subcontext: subContext,
			result_status: resultStatus,
			...(nonNullish(base) && { base }),
			...(nonNullish(quote) && { quote }),
			...(nonNullish(side) && { side }),
			...(nonNullish(orderType) && { orderType }),
			...(nonNullish(token) && { token }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
