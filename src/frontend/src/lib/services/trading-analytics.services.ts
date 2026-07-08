import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The order's time-in-force, as the two labels the form produces: fill-or-kill
// vs. good-til-canceled.
export type OisyTradeOrderType = 'FOK' | 'GTC';

// The limit-order lifecycle action, carried in `event_modifier`, so one
// `limit_order` event covers both placing and cancelling an order.
export type LimitOrderAction = 'create' | 'cancel';

export interface TrackLimitOrderParams {
	// The action → `event_modifier` (`create` / `cancel`).
	action: LimitOrderAction;
	// Lifecycle: `executing` when the flow starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// Order-pair leg symbols → `token_symbol` (base) / `token2_symbol` (quote).
	base?: string;
	quote?: string;
	// Order side (`buy` / `sell`) → `side`.
	side?: LimitOrderSide;
	// Time-in-force (`FOK` / `GTC`) → `order_type`.
	orderType?: OisyTradeOrderType;
	// Base-token quantity → `token_amount`, as a full-precision decimal string.
	baseAmount?: string;
	// Limit price (quote per base) → `price`, as a full-precision decimal string.
	price?: string;
	// Market USD reference prices per leg at action time → `token_usd_price` / `token2_usd_price`.
	baseUsdPrice?: number;
	quoteUsdPrice?: number;
	// Per-leg USD value of the order (amount × USD price) → `token_usd_value` / `token2_usd_value`.
	baseUsdValue?: number;
	quoteUsdValue?: number;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the whole limit-order lifecycle (place / cancel):
// the action rides in `event_modifier` and the outcome in `result_status`, so a
// single `limit_order` event covers every action × state distinguished by
// metadata rather than a bespoke event name per case.
export const trackLimitOrder = ({
	action,
	resultStatus,
	base,
	quote,
	side,
	orderType,
	baseAmount,
	price,
	baseUsdPrice,
	quoteUsdPrice,
	baseUsdValue,
	quoteUsdValue,
	error
}: TrackLimitOrderParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.LIMIT_ORDER,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRADING,
			event_provider: OISY_TRADE_PROVIDER_NAME,
			event_modifier: action,
			result_status: resultStatus,
			...(nonNullish(base) && { token_symbol: base }),
			...(nonNullish(quote) && { token2_symbol: quote }),
			...(nonNullish(side) && { side }),
			...(nonNullish(orderType) && { order_type: orderType }),
			...(notEmptyString(baseAmount) && { token_amount: baseAmount }),
			...(notEmptyString(price) && { price }),
			...(Number.isFinite(baseUsdPrice) && { token_usd_price: `${baseUsdPrice}` }),
			...(Number.isFinite(quoteUsdPrice) && { token2_usd_price: `${quoteUsdPrice}` }),
			...(Number.isFinite(baseUsdValue) && { token_usd_value: `${baseUsdValue}` }),
			...(Number.isFinite(quoteUsdValue) && { token2_usd_value: `${quoteUsdValue}` }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};

// The direction of the custody transfer, carried in `event_modifier`, so one
// `deposit_withdraw` event covers moving assets both into and out of the venue.
export type DepositWithdrawDirection = 'deposit' | 'withdraw';

export interface TrackDepositWithdrawParams {
	// The direction → `event_modifier` (`deposit` / `withdraw`).
	direction: DepositWithdrawDirection;
	// Lifecycle: `executing` when the flow starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// The moved token's symbol → `token_symbol`.
	token?: string;
	// Amount in the token's own units → `token_amount`, as a full-precision decimal string.
	amount?: string;
	// Market USD reference price at action time → `token_usd_price`.
	usdPrice?: number;
	// USD value of the moved amount (amount × USD price) → `token_usd_value`.
	usdValue?: number;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for moving assets in/out of a trading venue's custody
// account: the direction rides in `event_modifier`, the outcome in
// `result_status`. Venue-agnostic — `event_provider` names the venue.
export const trackDepositWithdraw = ({
	direction,
	resultStatus,
	token,
	amount,
	usdPrice,
	usdValue,
	error
}: TrackDepositWithdrawParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.DEPOSIT_WITHDRAW,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRADING,
			event_provider: OISY_TRADE_PROVIDER_NAME,
			event_modifier: direction,
			result_status: resultStatus,
			...(nonNullish(token) && { token_symbol: token }),
			...(notEmptyString(amount) && { token_amount: amount }),
			...(nonNullish(usdPrice) && { token_usd_price: `${usdPrice}` }),
			...(nonNullish(usdValue) && { token_usd_value: `${usdValue}` }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
