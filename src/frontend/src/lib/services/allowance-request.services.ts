import { allowSigning } from '$lib/api/backend.api';
import { ALLOWANCE_REQUEST_COOLDOWN_MILLIS } from '$lib/constants/app.constants';
import { trackRateLimited } from '$lib/services/analytics.services';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
import type { AllowanceRequestAnswer } from '$lib/types/api';
import type { NullishIdentity } from '$lib/types/identity';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

let pendingRequest: Promise<AllowanceRequestAnswer> | undefined;

const inCooldown = (): boolean => {
	const issue = get(allowanceIssueStore);

	return nonNullish(issue) && Date.now() - issue.refusedAt < ALLOWANCE_REQUEST_COOLDOWN_MILLIS;
};

const sendAllowanceRequest = async (identity: NullishIdentity): Promise<AllowanceRequestAnswer> => {
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

	if (inCooldown()) {
		return Promise.resolve({ answer: 'refused' });
	}

	pendingRequest = sendAllowanceRequest(identity).then((result) => {
		if (result.answer === 'refused') {
			allowanceIssueStore.setRefused();
		} else {
			allowanceIssueStore.clear();
		}

		pendingRequest = undefined;

		return result;
	});

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
	const { answer } = await sendAllowanceRequest(identity);

	if (answer !== 'refused') {
		allowanceIssueStore.clear();
	}
};

/**
 * After a charged call (CC) failed with an insufficient allowance, sends the AR and says whether to
 * repeat the CC: after a granted AR, or a skipped one that states a larger OISY allowance than the
 * failed CC did, because another tab or device got a new one in the meantime.
 *
 * Otherwise it asks for the toast that fits the answer: the allowance-issue toast for a refused AR,
 * or the warning that the CC costs more than the OISY allowance covers for a skipped one.
 */
export const requestAllowanceAfterInsufficientAllowance = async ({
	identity,
	allowance
}: {
	identity: NullishIdentity;
	allowance: bigint;
}): Promise<{ repeat: boolean }> => {
	const result = await requestAllowance(identity);

	if (
		result.answer === 'granted' ||
		(result.answer === 'skipped' && result.allowance > allowance)
	) {
		return { repeat: true };
	}

	allowanceToastStore.set({ toast: result.answer === 'skipped' ? 'exceeded' : 'issue' });

	return { repeat: false };
};
