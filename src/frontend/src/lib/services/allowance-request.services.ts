import { allowSigning } from '$lib/api/backend.api';
import { ALLOWANCE_REQUEST_COOLDOWN_MILLIS } from '$lib/constants/app.constants';
import {
	type AllowanceRequestTrigger,
	trackOisyAllowanceRequest
} from '$lib/services/allowance-analytics.services';
import { trackRateLimited } from '$lib/services/analytics.services';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import type { AllowanceRequestAnswer, InsufficientAllowanceOutcome } from '$lib/types/api';
import type { NullishIdentity } from '$lib/types/identity';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

let pendingRequest: Promise<AllowanceRequestAnswer> | undefined;

// The AR cooldown: the minute after a refused AR, during which OISY sends no AR, since the OISY
// allowance is known to be used up.
export const isAllowanceRequestInCooldown = (): boolean => {
	const issue = get(allowanceIssueStore);

	return nonNullish(issue) && Date.now() - issue.refusedAt < ALLOWANCE_REQUEST_COOLDOWN_MILLIS;
};

const askForAllowance = async (identity: NullishIdentity): Promise<AllowanceRequestAnswer> => {
	try {
		const { response, rateLimitInfo } = await allowSigning({
			identity,
			iiDelegationChain: nonNullish(identity) ? extractIIDelegationChain(identity) : []
		});

		// A request stopped by the hourly or the per-minute limit comes back as a skipped status with
		// the limit attached, but the limit refused it: no new allowance was set.
		if (nonNullish(rateLimitInfo)) {
			trackRateLimited(rateLimitInfo);

			return { answer: 'refused' };
		}

		const { status, allowed_cycles: allowance } = response;

		if ('Executed' in status) {
			return { answer: 'granted', allowance };
		}

		if ('Skipped' in status) {
			return { answer: 'skipped', allowance };
		}

		return { answer: 'refused' };
	} catch (_: unknown) {
		return { answer: 'refused' };
	}
};

/**
 * Sends one allowance request (AR) and counts it, with what triggered it. It sets no state:
 * `requestAllowance` and `requestAllowanceAtLoad` handle the allowance issue.
 *
 * It never throws: a request that fails counts as refused.
 */
const sendAllowanceRequest = async ({
	identity,
	trigger
}: {
	identity: NullishIdentity;
	trigger: AllowanceRequestTrigger;
}): Promise<AllowanceRequestAnswer> => {
	const result = await askForAllowance(identity);

	trackOisyAllowanceRequest({ trigger, answer: result.answer });

	return result;
};

/**
 * Sends an allowance request (AR) and keeps the allowance issue state in line with its answer: a
 * refused AR sets it, a granted or skipped one clears it.
 *
 * During the AR cooldown, no AR is sent and the answer is "refused". Callers that ask while an AR is
 * already in flight share its answer, so several calls failing at once send one AR.
 *
 * It never throws: a request that fails counts as refused.
 */
export const requestAllowance = (identity: NullishIdentity): Promise<AllowanceRequestAnswer> => {
	if (nonNullish(pendingRequest)) {
		return pendingRequest;
	}

	if (isAllowanceRequestInCooldown()) {
		return Promise.resolve({ answer: 'refused' });
	}

	pendingRequest = sendAllowanceRequest({ identity, trigger: 'insufficient_allowance' }).then(
		(result) => {
			if (result.answer === 'refused') {
				allowanceIssueStore.setRefused();
			} else {
				allowanceIssueStore.clear();
			}

			pendingRequest = undefined;

			return result;
		}
	);

	return pendingRequest;
};

/**
 * Sends the AR at load. As for any AR, a granted or skipped answer clears the allowance issue. A
 * refused one is silent: it sets no allowance issue and starts no AR cooldown, since the user may
 * still have enough OISY allowance left.
 *
 * It never throws: a request that fails counts as refused.
 */
export const requestAllowanceAtLoad = async (identity: NullishIdentity): Promise<void> => {
	const { answer } = await sendAllowanceRequest({ identity, trigger: 'load' });

	if (answer !== 'refused') {
		allowanceIssueStore.clear();
	}
};

/**
 * After a charged call (CC) failed with an insufficient allowance, sends the AR and says what
 * follows: a repeat after a granted AR, or a skipped one that states a larger OISY allowance than
 * the failed CC did, because another tab or device got a new one in the meantime. Otherwise the AR
 * was refused, or the CC costs more than the OISY allowance covers (a skipped AR). The caller shows
 * the toast that fits, since the user's own cycles may still pay the CC.
 */
export const requestAllowanceAfterInsufficientAllowance = async ({
	identity,
	allowance
}: {
	identity: NullishIdentity;
	allowance: bigint;
}): Promise<InsufficientAllowanceOutcome> => {
	const result = await requestAllowance(identity);

	if (
		result.answer === 'granted' ||
		(result.answer === 'skipped' && result.allowance > allowance)
	) {
		return 'repeat';
	}

	return result.answer === 'skipped' ? 'exceeded' : 'refused';
};
