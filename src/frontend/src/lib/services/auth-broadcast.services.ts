import { OISY_URL } from '$lib/constants/oisy.constants';
import { authStore } from '$lib/stores/auth.store';

export const AUTH_BROADCAST_CHANNEL = 'oisy_auth_channel';

export const AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS = 'authClientLoginSuccess';

export interface AuthBroadcastChannelInterface {
	init: () => void;
	close: () => void;
	postLoginSuccess: () => void;
}

// If the user has more than one tab open in the same browser,
// there could be a mismatch of the cached delegation chain vs the identity key of the `authClient` object.
// This causes the `authClient` to be unable to correctly sign calls, raising Trust Errors.
// To mitigate this, we use a `BroadcastChannel` to notify other tabs when a login has occurred, so that they can sync their `authClient` object.
class AuthBroadcastChannel implements AuthBroadcastChannelInterface {
	readonly #bc: BroadcastChannel

	constructor() {
		this.#bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
	}

	private onLoginSuccess = (handler: () => Promise<void>) => {
		this.#bc.onmessage = async (event) => {
			if (event.origin === OISY_URL && event.data === AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS) {
				await handler();
			}
		};
	};

	init = () => {
		this.onLoginSuccess(authStore.forceSync);
	};

	close = () => {
		this.#bc.close();
	};

	postLoginSuccess = () => {
		this.#bc.postMessage(AUTH_BROADCAST_MESSAGE_LOGIN_SUCCESS);
	};
}

export const initAuthBroadcastChannel = (): AuthBroadcastChannel => {
	const bc = new AuthBroadcastChannel();

	bc.init();

	return bc;
};

export const broadcastAuthClientLoginSuccess = () => {
	const bc = new AuthBroadcastChannel();

	bc.postLoginSuccess();

	bc.close();
};
