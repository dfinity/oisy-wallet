import { OISY_URL } from '$lib/constants/oisy.constants';
import { authStore } from '$lib/stores/auth.store';

const AUTH_BROADCAST_CHANNEL = 'oisy_auth_channel';

const AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS = 'authClientLoginSuccess';

// If the user has more than one tab open in the same browser,
// there could be a mismatch of the cached delegation chain vs the identity key of the `authClient` object.
// This causes the `authClient` to be unable to correctly sign calls, raising Trust Errors.
// To mitigate this, we use a `BroadcastChannel` to notify other tabs when a login has occurred, so that they can sync their `authClient` object.
export class AuthBroadcastChannel extends BroadcastChannel {
	constructor() {
		super(AUTH_BROADCAST_CHANNEL);
	}

	postLoginSuccess = () => {
		this.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);
	};

	private onLoginSuccess = (handler: () => Promise<void>) => {
		this.onmessage = async (event) => {
			if (event.origin === OISY_URL && event.data === AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS) {
				await handler();
			}
		};
	};

	init = () => {
		this.onLoginSuccess(authStore.sync);
	};
}

export const broadcastAuthClientLoginSuccess = () => {
	const bc = new AuthBroadcastChannel();

	bc.postLoginSuccess();
};
