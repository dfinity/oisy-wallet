import { browser } from '$app/environment';
import { WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS } from '$lib/constants/wallet-connect.constants';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

const STORAGE_KEY = 'wallet-connect-unchecked-signing';

// The moment the switch turns itself off, in milliseconds since the epoch.
//
// Kept in the session storage of this tab, never in local storage or the user profile: every
// sign-out path clears session storage, a reload keeps it, and it never reaches another tab or
// another device.
const read = (): number | undefined => {
	try {
		if (!browser) {
			return;
		}

		const stored = sessionStorage.getItem(STORAGE_KEY);

		if (isNullish(stored)) {
			return;
		}

		const expiresAt: unknown = JSON.parse(stored);

		return typeof expiresAt === 'number' ? expiresAt : undefined;
	} catch (err: unknown) {
		// We use the session storage for the operational part of the app but, not crucial
		consoleError(err);
	}
};

const write = (expiresAt: number | undefined) => {
	try {
		if (!browser) {
			return;
		}

		if (isNullish(expiresAt)) {
			sessionStorage.removeItem(STORAGE_KEY);
			return;
		}

		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(expiresAt));
	} catch (err: unknown) {
		// Failing to store it only means the switch does not survive a reload, which errs off.
		consoleError(err);
	}
};

export interface WalletConnectUncheckedSigningStore extends Readable<number | undefined> {
	enable: () => void;
	disable: () => void;
}

const initWalletConnectUncheckedSigningStore = (): WalletConnectUncheckedSigningStore => {
	const { subscribe, set } = writable<number | undefined>(read());

	const update = (expiresAt: number | undefined) => {
		write(expiresAt);
		set(expiresAt);
	};

	return {
		subscribe,
		enable: () => update(Date.now() + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS),
		disable: () => update(undefined)
	};
};

export const walletConnectUncheckedSigningStore = initWalletConnectUncheckedSigningStore();
