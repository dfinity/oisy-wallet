import { AUTH_TIMER_INTERVAL, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { nonNullish } from '@dfinity/utils';
import { type DelegationChain, isDelegationValid } from '@icp-sdk/core/identity';

export const onAuthMessage = async ({
	data
	// eslint-disable-next-line require-await
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'startIdleTimer':
			startIdleTimer();
			return;
		case 'stopIdleTimer':
			stopIdleTimer();
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const scheduleNext = (): void => {
	timer = setTimeout(async () => {
		await onIdleSignOut();

		if (nonNullish(timer)) {
			scheduleNext();
		}
	}, AUTH_TIMER_INTERVAL);
};

/**
 * The timer is executed only if the user has signed in
 */
const startIdleTimer = () => {
	if (nonNullish(timer)) {
		return;
	}

	scheduleNext();
};

const stopIdleTimer = () => {
	if (!timer) {
		return;
	}

	clearTimeout(timer);
	timer = undefined;
};

const onIdleSignOut = async () => {
	const chain = await checkDelegationChain();

	// Delegation is valid — the user has an active session
	if (chain.valid && chain.delegation !== null) {
		emitExpirationTime(chain.delegation);
		return;
	}

	logout();
};

/** Read the shared session provider: browser IDB or the worker's in-memory mobile delegation. */
const checkDelegationChain = async (): Promise<{
	valid: boolean;
	delegation: DelegationChain | null;
}> => {
	const delegation = (await AuthClientProvider.getInstance().loadDelegation()) ?? null;

	return {
		valid: nonNullish(delegation) && isDelegationValid(delegation),
		delegation
	};
};

// We do the logout on the client side because we reload the window to reload stores afterwards
const logout = () => {
	// Clear timer to avoid emitting sign-out multiple times
	stopIdleTimer();

	postMessage({ msg: 'signOutIdleTimer' });
};

const emitExpirationTime = (delegation: DelegationChain) => {
	const expirationTime = delegation.delegations.reduce<bigint | undefined>(
		(expiration, { delegation: item }) =>
			expiration === undefined || item.expiration < expiration ? item.expiration : expiration,
		undefined
	);

	// That would be unexpected here because the delegation has just been tested and is valid
	if (expirationTime === undefined) {
		return;
	}

	// 1_000_000 as NANO_SECONDS_IN_MILLISECOND. Constant not imported to not break prod build.
	const authRemainingTime =
		new Date(Number(expirationTime / NANO_SECONDS_IN_MILLISECOND)).getTime() - Date.now();

	postMessage({
		msg: 'delegationRemainingTime',
		data: {
			authRemainingTime
		}
	});
};
