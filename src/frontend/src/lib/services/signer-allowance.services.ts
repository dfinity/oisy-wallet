import { allowSigning } from '$lib/api/backend.api';
import { trackRateLimited } from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { consoleWarn } from '$lib/utils/console.utils';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

let replenishing = false;

/**
 * Best-effort re-grant of the per-user signer allowance after it was exhausted
 * (an `isSignerCanisterAllowanceError`).
 *
 * This is the same `allow_signing` call the boot loader makes ({@link initSignerAllowance}),
 * but **without** the sign-out-on-failure: a page reload would replenish the allowance, so we
 * do it in the background instead, letting the next signing attempt succeed without a reload.
 *
 * It is intentionally fire-and-forget and never throws: when the caller has hit the
 * `allow_signing` rate limit (the real per-user / daily cap) the call fails quietly and the
 * user keeps seeing the "limit reached" message. We deliberately do **not** auto-retry the
 * original signing operation here — the user retries it.
 *
 * Single-flight: concurrent signer errors do not fan out into multiple `allow_signing` calls.
 */
export const replenishSignerAllowance = async (): Promise<void> => {
	if (replenishing) {
		return;
	}

	replenishing = true;

	try {
		const { identity } = get(authStore);

		const { rateLimitInfo } = await allowSigning({
			identity,
			iiDelegationChain: nonNullish(identity) ? extractIIDelegationChain(identity) : []
		});

		if (nonNullish(rateLimitInfo)) {
			trackRateLimited(rateLimitInfo);
		}
	} catch (err: unknown) {
		// Best-effort: a failure here (e.g. the allow_signing rate limit / daily quota) must never
		// sign the user out or interrupt the flow — they simply keep the "limit reached" message.
		consoleWarn('Failed to replenish the signer allowance.', err);
	} finally {
		replenishing = false;
	}
};
