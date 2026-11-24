import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { AllowanceRequestAnswer } from '$lib/types/api';

export type AllowanceRequestOutcome = 'repeated' | 'repeat_failed' | 'not_repeated';

/**
 * Counts each allowance request (AR) after a charged call ran out of the OISY allowance: its
 * answer, and whether the call was repeated and worked. It carries nothing about the user, the
 * call or the amounts.
 */
export const trackOisyAllowanceRequest = ({
	answer,
	outcome
}: {
	answer: AllowanceRequestAnswer['answer'];
	outcome: AllowanceRequestOutcome;
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.OISY_ALLOWANCE_REQUEST,
		metadata: {
			event_key: answer,
			event_value: outcome
		}
	});
};
