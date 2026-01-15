import { AUTH_TIMER_INTERVAL, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { nonNullish } from '@dfinity/utils';
import { KEY_STORAGE_DELEGATION } from '@icp-sdk/auth/client';
import { DelegationChain, isDelegationValid } from '@icp-sdk/core/identity';

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
	const [auth, chain] = await Promise.all([checkAuthentication(), checkDelegationChain()]);

	// Both identity and delegation are alright, so all good
	if (auth && chain.valid && chain.delegation !== null) {
		emitExpirationTime(chain.delegation);
		return;
	}

	logout();
};

/**
 * If the user is not authenticated - i.e. no identity or anonymous and there is no valid delegation chain, then identity is not valid
 *
 * @returns true if authenticated
 */
const checkAuthentication = async (): Promise<boolean> => {
	const authClient = await AuthClientProvider.getInstance().createAuthClient();
	return authClient.isAuthenticated();
};

/**
 * If there is no delegation or if not valid, then the delegation is not valid
 *
 * @returns true if delegation is valid
 */
const checkDelegationChain = async (): Promise<{
	valid: boolean;
	delegation: DelegationChain | null;
}> => {
	const delegationChain =
		await AuthClientProvider.getInstance().storage.get(KEY_STORAGE_DELEGATION);

	const delegation = delegationChain !== null ? DelegationChain.fromJSON(delegationChain) : null;

	return {
		valid: delegation !== null && isDelegationValid(delegation),
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
	const expirationTime: bigint | undefined = delegation.delegations[0]?.delegation.expiration;

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
