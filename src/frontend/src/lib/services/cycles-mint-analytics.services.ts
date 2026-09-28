import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The step in the mint funnel → `event_modifier`: the Mint modal was opened, or a mint
// ran (`executing`, then `success` / `error`).
export type CyclesMintStep = 'open' | 'mint';

/**
 * Why a mint ended in `error` → `result_error_code`. Deliberately a code and never the
 * CMC's own reason text, which can name the caller's account.
 *
 * - `refunded`: the CMC returned the ICP, minus its fees.
 * - `failed`: the CMC gave a final answer other than a refund.
 * - `transfer_failed`: the ICP ledger refused the transfer, so nothing moved.
 * - `not_trackable`: the mint could not be recorded and did not start, so nothing moved.
 * - `timed_out`: the tab was suspended between recording the mint and sending the ICP,
 *   so the mint was abandoned and nothing moved.
 * - `not_sent`: a later session found no deposit for a mint whose tab died, so nothing moved.
 */
export type CyclesMintErrorCode =
	'refunded' | 'failed' | 'transfer_failed' | 'not_trackable' | 'timed_out' | 'not_sent';

// No amounts and no USD value, on purpose: every mint is a transfer to one of the CMC's
// deposit accounts with the `MINT` memo, so an exact amount and the event's time would
// pick out the one block on the public ICP ledger, and with it the sender's account
// (`docs/ai/frontend/analytics.md` §6).
export interface TrackCyclesMintParams {
	step: CyclesMintStep;
	// Omitted for `open`, which cannot fail.
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// ICP paid → `token_symbol`.
	sourceSymbol?: string;
	// TCYCLES received → `token2_symbol`.
	destinationSymbol?: string;
	errorCode?: CyclesMintErrorCode;
}

export const trackCyclesMint = ({
	step,
	resultStatus,
	sourceSymbol,
	destinationSymbol,
	errorCode
}: TrackCyclesMintParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CYCLES_MINT,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.COMPUTE,
			event_modifier: step,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS,
			...(nonNullish(resultStatus) && { result_status: resultStatus }),
			...(notEmptyString(sourceSymbol) && { token_symbol: sourceSymbol }),
			...(notEmptyString(destinationSymbol) && { token2_symbol: destinationSymbol }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
