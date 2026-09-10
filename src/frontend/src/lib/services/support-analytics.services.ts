import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The action on the Support page, carried in `event_modifier`, so one `support`
// event covers the whole page rather than a family of `support_*` names.
export type SupportAction = 'open' | 'contact' | 'select_pool' | 'withdraw';

export interface TrackSupportParams {
	// The action → `event_modifier`.
	action: SupportAction;
	// Lifecycle: `executing` when an async action starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// The card the action happened in → `event_subcontext`; omitted for the page itself.
	subcontext?: PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT;
	// Pool leg symbols → `token_symbol` / `token2_symbol`.
	token?: string;
	token2?: string;
	// The withdrawn token's ICRC standard → `token_standard`.
	tokenStandard?: string;
	// How many withdrawable balances a `select_pool` turned up → `event_key: balances_found`
	// + `event_value`. A count, deliberately never the amounts (see below).
	balancesFound?: number;
	// Destination URL of the help link → `event_value`, for the `contact` action.
	link?: string;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the Support page: the action rides in
// `event_modifier`, the card in `event_subcontext` and the outcome in
// `result_status`, so a single `support` event covers every action x state
// distinguished by metadata rather than a bespoke event name per case.
//
// Privacy: withdrawal events deliberately carry no `token_amount` and no
// `token_usd_value`. A stuck ICPSwap balance is a rare event with a
// distinctive amount that is also visible on-chain, which is exactly the
// de-anonymising join forbidden by invariant 3 in docs/ai/frontend/analytics.md.
// The `balances_found` count on `select_pool` carries the same product signal.
export const buildSupportEvent = ({
	action,
	resultStatus,
	subcontext,
	token,
	token2,
	tokenStandard,
	balancesFound,
	link,
	error
}: TrackSupportParams): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.SUPPORT,
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.SUPPORT,
		event_modifier: action,
		source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SUPPORT_PAGE,
		result_status: resultStatus,
		...(nonNullish(subcontext) && { event_subcontext: subcontext }),
		...(nonNullish(token) && { token_symbol: token }),
		...(nonNullish(token2) && { token2_symbol: token2 }),
		...(notEmptyString(tokenStandard) && { token_standard: tokenStandard }),
		...(nonNullish(balancesFound) && {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.BALANCES_FOUND,
			event_value: `${balancesFound}`
		}),
		...(notEmptyString(link) && {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.LINK,
			event_value: link
		}),
		...(notEmptyString(error) && { result_error: error })
	}
});

// Fires the event built above. Call sites that must hand the payload to a child
// component's own click handler (e.g. ExternalLink) use `buildSupportEvent`
// instead, per the return-vs-fire rule in docs/ai/frontend/analytics.md.
export const trackSupport = (params: TrackSupportParams) => {
	trackEvent(buildSupportEvent(params));
};
