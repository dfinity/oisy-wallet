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

export interface TrackCyclesMintParams {
	step: CyclesMintStep;
	// Omitted for `open`, which cannot fail.
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// ICP paid → `token_symbol` / `token_amount` / `token_usd_value`.
	sourceSymbol?: string;
	sourceAmount?: string;
	sourceUsdValue?: string;
	// TCYCLES received → `token2_symbol` / `token2_amount`: the estimate while executing,
	// what was credited on success.
	destinationSymbol?: string;
	destinationAmount?: string;
	errorCode?: CyclesMintErrorCode;
}

export const trackCyclesMint = ({
	step,
	resultStatus,
	sourceSymbol,
	sourceAmount,
	sourceUsdValue,
	destinationSymbol,
	destinationAmount,
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
			...(notEmptyString(sourceAmount) && { token_amount: sourceAmount }),
			...(notEmptyString(sourceUsdValue) && { token_usd_value: sourceUsdValue }),
			...(notEmptyString(destinationSymbol) && { token2_symbol: destinationSymbol }),
			...(notEmptyString(destinationAmount) && { token2_amount: destinationAmount }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
