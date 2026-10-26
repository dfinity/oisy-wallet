import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The step in the top-up funnel → `event_modifier`: the Top up modal was opened, or a
// top-up ran (`executing`, then `success` / `error`).
export type CyclesTopUpStep = 'open' | 'top_up';

/**
 * Why a top-up ended in `error` → `result_error_code`.
 *
 * - `refused`: the cycles ledger refused it before burning anything, so nothing moved.
 * - `refunded`: the canister could not receive the cycles, and the ledger returned them
 *   minus its fees.
 * - `unknown`: the call got no answer, so the top-up may or may not have gone through.
 */
export type CyclesTopUpErrorCode = 'refused' | 'refunded' | 'unknown';

// How serious a failed top-up is → `event_severity`, for the monitoring dashboards. A refusal
// moved nothing, and no answer is often a passing outage, so both warn. A refund cost twice the
// fee, and the canister check should have kept that canister out, so it is an error. A top-up
// that went through has no severity.
const ERROR_SEVERITIES: Record<CyclesTopUpErrorCode, PLAUSIBLE_EVENT_SEVERITIES> = {
	refused: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	unknown: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	refunded: PLAUSIBLE_EVENT_SEVERITIES.ERROR
};

// No amount and no canister ID, on purpose: either one, with the event's time, would pick
// out the one burn on the public cycles ledger, and with it the user's account
// (`docs/ai/frontend/analytics.md` §6). That includes an amount range: almost every burn on
// the cycles ledger is below $1, so any larger range would still single a top-up out.
export interface TrackCyclesTopUpParams {
	step: CyclesTopUpStep;
	// Omitted for `open`, which cannot fail.
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// TCYCLES spent → `token_symbol`.
	tokenSymbol?: string;
	errorCode?: CyclesTopUpErrorCode;
}

export const trackCyclesTopUp = ({
	step,
	resultStatus,
	tokenSymbol,
	errorCode
}: TrackCyclesTopUpParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CYCLES_TOP_UP,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.COMPUTE,
			event_modifier: step,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS,
			...(nonNullish(resultStatus) && { result_status: resultStatus }),
			...(notEmptyString(tokenSymbol) && { token_symbol: tokenSymbol }),
			...(nonNullish(errorCode) && {
				result_error_code: errorCode,
				event_severity: ERROR_SEVERITIES[errorCode]
			})
		}
	});
};
