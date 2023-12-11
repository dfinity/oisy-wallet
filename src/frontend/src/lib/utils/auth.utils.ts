import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

export const createAuthClient = (): Promise<AuthClient> =>
	AuthClient.create({
		idleOptions: {
			disableIdle: true,
			disableDefaultIdleCallback: true
		}
	});

/**
 * In certain features, we want to execute jobs with the authenticated identity without getting it from the auth.store.
 * This is notably useful for Web Workers which do not have access to the window.
 */
export const loadIdentity = async (): Promise<Identity | undefined> => {
	const authClient = await createAuthClient();
	const authenticated = await authClient.isAuthenticated();

	// Not authenticated therefore we provide no identity as a result
	if (!authenticated) {
		return undefined;
	}

	return authClient.getIdentity();
};
