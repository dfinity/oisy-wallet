import { OISY_TRADE_ANALYTICS_DAPP_NAME } from '$lib/constants/oisy-trade.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The order's time-in-force, as the two labels the form produces: fill-or-kill
// vs. good-til-canceled.
export type OisyTradeOrderType = 'FOK' | 'GTC';

export interface TrackTradingParams {
	// Which trading flow the event belongs to (limit order / cancel / deposit / withdraw).
	subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING;
	// Lifecycle: `executing` when the flow starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// Order pair leg symbols — free-form token symbols (no closed set), so kept as strings.
	// Emitted as the swap-style `token`/`token2` metadata keys (base → token, quote → token2).
	base?: string;
	quote?: string;
	side?: LimitOrderSide;
	orderType?: OisyTradeOrderType;
	// Single-token flows (deposit/withdraw). Emitted as the `token` metadata key.
	token?: string;
	// Traded amount in the primary token's own units (the deposited/withdrawn token, or the
	// order's base token), as a full-precision decimal string so volume aggregates per token.
	volume?: string;
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
	volume,
	error
}: TrackTradingParams) => {
	// The primary token key is sourced from `token` (deposit/withdraw) or the order's `base`.
	const primaryToken = token ?? base;
	trackEvent({
		name: PLAUSIBLE_EVENTS.TRADING,
		metadata: {
			dApp: OISY_TRADE_ANALYTICS_DAPP_NAME,
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRADING,
			event_subcontext: subContext,
			result_status: resultStatus,
			...(nonNullish(primaryToken) && { token: primaryToken }),
			...(nonNullish(quote) && { token2: quote }),
			...(nonNullish(side) && { side }),
			...(nonNullish(orderType) && { orderType }),
			...(notEmptyString(volume) && { volume }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
