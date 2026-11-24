import {
	PLAUSIBLE_EVENT_CHARGED_CALL_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { AllowanceRequestAnswer } from '$lib/types/api';

export type AllowanceRequestTrigger = 'load' | 'insufficient_allowance';

/**
 * Counts every allowance request (AR): what triggered it, the app load or a charged call that ran
 * out, and its answer. It carries nothing about the user or the amounts.
 */
export const trackOisyAllowanceRequest = ({
	trigger,
	answer
}: {
	trigger: AllowanceRequestTrigger;
	answer: AllowanceRequestAnswer['answer'];
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.OISY_ALLOWANCE_REQUEST,
		metadata: {
			event_trigger: trigger,
			event_key: answer
		}
	});
};

/**
 * Counts a charged call (CC) that failed because its allowance did not cover it, by the canister
 * method it called. Successful CCs are not counted: the flows' own events do that.
 */
export const trackChargedCallInsufficientAllowance = ({ method }: { method: string }) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CHARGED_CALL,
		metadata: {
			event_key: method,
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			result_error_type: PLAUSIBLE_EVENT_CHARGED_CALL_ERROR_TYPES.INSUFFICIENT_ALLOWANCE
		}
	});
};
