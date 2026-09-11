import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_HELP
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import type { HelpExplorerChain } from '$lib/types/help';
import type { SwapProvider } from '$lib/types/swap';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The action on the Help page, carried in `event_modifier`, so one `help`
// event covers the whole page rather than a family of `help_*` names.
export type HelpAction = 'open' | 'contact' | 'explorer' | 'scan' | 'select_pool' | 'withdraw';

export interface TrackHelpParams {
	// The action → `event_modifier`.
	action: HelpAction;
	// Lifecycle: `executing` when an async action starts, then `success` / `error`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// The card the action happened in → `event_subcontext`; omitted for the page itself.
	subcontext?: PLAUSIBLE_EVENT_SUBCONTEXT_HELP;
	// Pool leg symbols → `token_symbol` / `token2_symbol`.
	token?: string;
	token2?: string;
	// The withdrawn token's ICRC standard → `token_standard`.
	tokenStandard?: string;
	// How many withdrawable balances a `select_pool` or `scan` turned up → `event_key:
	// balances_found` + `event_value`. A count, deliberately never the amounts (see below).
	balancesFound?: number;
	// How many pools a `scan` looked at → `source_detail`.
	poolsScanned?: number;
	// Destination URL of the help link → `event_value`, for the `contact` action.
	// Only for links that are constants: never for a provider explorer URL, which
	// embeds a wallet address (privacy invariant 3, see below).
	link?: string;
	// Third-party provider the action targeted → `event_provider`. Carries the
	// `SwapProvider` id rather than the display name, so UI copy can change without
	// moving the Plausible dimension.
	provider?: SwapProvider;
	// Chain the provider link is scoped to → `event_key: network` + `event_value`.
	network?: HelpExplorerChain;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the Help page: the action rides in
// `event_modifier`, the card in `event_subcontext` and the outcome in
// `result_status`, so a single `help` event covers every action x state
// distinguished by metadata rather than a bespoke event name per case.
//
// Privacy: withdrawal events deliberately carry no `token_amount` and no
// `token_usd_value`. A stuck ICPSwap balance is a rare event with a
// distinctive amount that is also visible on-chain, which is exactly the
// de-anonymising join forbidden by invariant 3 in docs/ai/frontend/analytics.md.
// The `balances_found` count on `select_pool` carries the same product signal.
// The same rule keeps provider explorer URLs out of `link`: they embed a wallet
// address, so those clicks report the provider and the chain instead.
//
// `balances_found`, `link` and `network` all land in `event_key` / `event_value`.
// No action produces more than one of them, so the last one set wins by construction
// rather than by accident - add a numbered suffix (`event_key2`) on the first overlap.
export const buildHelpEvent = ({
	action,
	resultStatus,
	subcontext,
	token,
	token2,
	tokenStandard,
	balancesFound,
	poolsScanned,
	link,
	provider,
	network,
	error
}: TrackHelpParams): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.HELP,
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.HELP,
		event_modifier: action,
		source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.HELP_PAGE,
		result_status: resultStatus,
		...(nonNullish(subcontext) && { event_subcontext: subcontext }),
		...(nonNullish(token) && { token_symbol: token }),
		...(nonNullish(token2) && { token2_symbol: token2 }),
		...(notEmptyString(tokenStandard) && { token_standard: tokenStandard }),
		...(nonNullish(balancesFound) && {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.BALANCES_FOUND,
			event_value: `${balancesFound}`
		}),
		...(nonNullish(poolsScanned) && { source_detail: `${poolsScanned}` }),
		...(notEmptyString(link) && {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.LINK,
			event_value: link
		}),
		...(nonNullish(provider) && { event_provider: provider }),
		...(nonNullish(network) && {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
			event_value: network
		}),
		...(notEmptyString(error) && { result_error: error })
	}
});

// Fires the event built above. Call sites that must hand the payload to a child
// component's own click handler (e.g. ExternalLink) use `buildHelpEvent`
// instead, per the return-vs-fire rule in docs/ai/frontend/analytics.md.
export const trackHelp = (params: TrackHelpParams) => {
	trackEvent(buildHelpEvent(params));
};
