import { browser } from '$app/environment';
import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
import {
	clearIdbBtcAddressMainnet,
	clearIdbBtcAddressTestnet,
	clearIdbEthAddress,
	clearIdbSolAddressDevnet,
	clearIdbSolAddressLocal,
	clearIdbSolAddressMainnet
} from '$lib/api/idb-addresses.api';
import { clearIdbBalances } from '$lib/api/idb-balances.api';
import { clearIdbAllCustomTokens } from '$lib/api/idb-tokens.api';
import {
	clearIdbBtcTransactions,
	clearIdbEthTransactions,
	clearIdbIcTransactions,
	clearIdbSolTransactions
} from '$lib/api/idb-transactions.api';
import { deleteIdbAllOisyRelated } from '$lib/api/idb.api';
import {
	TRACK_COUNT_SIGN_IN_SUCCESS,
	TRACK_SIGN_IN_CANCELLED_COUNT,
	TRACK_SIGN_IN_ERROR_COUNT,
	TRACK_SIGN_IN_UNDEFINED_AUTH_CLIENT_ERROR,
	TRACK_SIGN_OUT_ERROR,
	TRACK_SIGN_OUT_SUCCESS,
	TRACK_SIGN_OUT_WITH_WARNING
} from '$lib/constants/analytics.constants';
import { PARAM_DELETE_IDB_CACHE, PARAM_LEVEL, PARAM_MSG } from '$lib/constants/routes.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	authLoggedInAnotherTabStore,
	authStore,
	type AuthSignInParams
} from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { AUTH_LOCK_KEY } from '$lib/stores/locked.store';
import { toastsClean, toastsError, toastsShow } from '$lib/stores/toasts.store';
import { InternetIdentityDomain } from '$lib/types/auth';
import { AuthClientNotInitializedError } from '$lib/types/errors';
import type { ToastMsg } from '$lib/types/toast';
import { emit } from '$lib/utils/events.utils';
import { gotoReplaceRoot } from '$lib/utils/nav.utils';
import { replaceHistory } from '$lib/utils/route.utils';
import { get as getStorage } from '$lib/utils/storage.utils';
import { randomWait } from '$lib/utils/time.utils';
import type { ToastLevel } from '@dfinity/gix-components';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const signIn = async (
	params: AuthSignInParams
): Promise<{ success: 'ok' | 'cancelled' | 'error'; err?: unknown }> => {
	busy.show();

	const trackingMetadata = {
		domain: params.domain ?? InternetIdentityDomain.VERSION_1_0
	};

	try {
		const fn = get(authLoggedInAnotherTabStore)
			? () => authStore.forceSync()
			: () => authStore.signIn(params);

		await fn();

		trackEvent({
			name: TRACK_COUNT_SIGN_IN_SUCCESS,
			metadata: trackingMetadata
		});

		// We clean previous messages in case the user was signed out automatically before signing-in again.
		toastsClean();

		authLoggedInAnotherTabStore.set(false);

		return { success: 'ok' };
	} catch (err: unknown) {
		if (err === 'UserInterrupt') {
			trackEvent({
				name: TRACK_SIGN_IN_CANCELLED_COUNT,
				metadata: trackingMetadata
			});

			// We do not display an error if the user explicitly cancelled the process of sign-in
			return { success: 'cancelled' };
		}

		if (err instanceof AuthClientNotInitializedError) {
			trackEvent({
				name: TRACK_SIGN_IN_UNDEFINED_AUTH_CLIENT_ERROR,
				metadata: trackingMetadata
			});

			toastsError({
				msg: { text: get(i18n).auth.warning.reload_and_retry }
			});

			return { success: 'error', err };
		}

		trackEvent({
			name: TRACK_SIGN_IN_ERROR_COUNT,
			metadata: trackingMetadata
		});

		toastsError({
			msg: { text: get(i18n).auth.error.error_while_signing_in },
			err
		});

		return { success: 'error', err };
	} finally {
		await disconnectWalletConnect();

		busy.stop();
	}
};

export const signOut = ({
	resetUrl = false,
	source = ''
}: {
	resetUrl?: boolean;
	source?: string;
}): Promise<void> => {
	trackSignOut({
		name: TRACK_SIGN_OUT_SUCCESS,
		meta: { reason: 'user', resetUrl, source }
	});
	return logout({ resetUrl });
};

export const errorSignOut = (text: string): Promise<void> => {
	trackSignOut({
		name: TRACK_SIGN_OUT_ERROR,
		meta: { reason: 'error', level: 'error', text }
	});
	return logout({
		msg: {
			text,
			level: 'error'
		}
	});
};

export const warnSignOut = (text: string): Promise<void> => {
	trackSignOut({
		name: TRACK_SIGN_OUT_WITH_WARNING,
		meta: { reason: 'warning', level: 'warn', text }
	});
	return logout({
		msg: {
			text,
			level: 'warn'
		}
	});
};

export const nullishSignOut = (): Promise<void> =>
	warnSignOut(get(i18n).auth.warning.not_signed_in);

export const idleSignOut = (): Promise<void> => {
	const locked = getStorage({ key: AUTH_LOCK_KEY });

	const level: ToastLevel = locked ? 'info' : 'warn';

	const text = locked
		? get(i18n).auth.message.session_locked
		: get(i18n).auth.warning.session_expired;

	const reason = locked ? 'session_locked' : 'session_expired';

	trackEvent({
		name: TRACK_SIGN_OUT_WITH_WARNING,
		metadata: { level, text, reason, clearStorages: 'false' }
	});

	return logout({
		msg: {
			text,
			level
		},
		clearIdbStorages: false
	});
};

export const lockSession = ({ resetUrl = false }: { resetUrl?: boolean }): Promise<void> =>
	logout({
		resetUrl,
		clearIdbStorages: false
	});

const clearIdbStore = async (clearIdbStore: () => Promise<void>) => {
	try {
		await clearIdbStore();
	} catch (err: unknown) {
		// We silence the error.
		// Effective logout is more important here.
		console.error(err);
	}
};

const clearIdbStoreList = [
	// Addresses
	clearIdbBtcAddressMainnet,
	clearIdbBtcAddressTestnet,
	clearIdbEthAddress,
	clearIdbSolAddressMainnet,
	clearIdbSolAddressDevnet,
	clearIdbSolAddressLocal,
	// Tokens
	clearIdbAllCustomTokens,
	// Transactions
	clearIdbBtcTransactions,
	clearIdbEthTransactions,
	clearIdbIcTransactions,
	clearIdbSolTransactions,
	// Balances
	clearIdbBalances
];

// eslint-disable-next-line require-await
const clearSessionStorage = async () => {
	if (browser) {
		sessionStorage.clear();
	}
};

const disconnectWalletConnect = async () => {
	emit({ message: 'oisyDisconnectWalletConnect' });

	// Wait until WalletConnect is not connected or until a certain max number of attempts is made.
	let count = 0;
	while (get(walletConnectPaired) && count < 10) {
		await randomWait({ min: 1000, max: 1000 });
		count++;
	}
};

const logout = async ({
	clearIdbStorages = true,
	...params
}: { clearIdbStorages?: boolean } & ({ msg?: ToastMsg } | { resetUrl?: boolean })) => {
	const { msg, resetUrl } = {
		msg: undefined,
		resetUrl: false,
		...params
	};

	// To mask not operational UI (a side effect of sometimes slow JS loading after window.reload because of service worker and no cache).
	busy.start();

	await disconnectWalletConnect();

	if (clearIdbStorages) {
		await Promise.all(clearIdbStoreList.map(clearIdbStore));

		// Delete all possible OISY-related indexedDB
		// We should clear them first, since the deletion may not be supported in the current browser
		await clearIdbStore(deleteIdbAllOisyRelated);
	}

	try {
		await clearSessionStorage();
	} catch (err: unknown) {
		console.warn('Error clearing session storage on logout', err);
	}

	await authStore.signOut();

	// No need to append the message if we are resetting the url.
	// The reset will redirect the user to the root, so any appended message would be lost.
	if (resetUrl) {
		await gotoReplaceRoot(clearIdbStorages);
	}

	appendMsgToUrl({
		...(nonNullish(msg) ? { msg } : {}),
		deleteIdbCache: clearIdbStorages
	});

	// Auth: Delegation and identity are cleared from indexedDB by agent-js so, we do not need to clear these

	// Preferences: We do not clear local storage as well. It contains anonymous information such as the selected theme.
	// Information the user wants to preserve across sign-in. e.g. if I select the light theme, logout and sign-in again, I am happy if the dapp still uses the light theme.

	// We reload the page to make sure all the states are cleared
	window.location.reload();
};

/**
 * If a message was provided to the logout process - e.g. a message informing the logout happened because the session timed-out - append the information to the url as query params
 */
const appendMsgToUrl = ({ msg, deleteIdbCache }: { msg?: ToastMsg; deleteIdbCache?: boolean }) => {
	if (typeof window === 'undefined') {
		return;
	}

	const url: URL = new URL(window.location.href);

	if (nonNullish(msg)) {
		const { text, level } = msg;

		url.searchParams.append(PARAM_MSG, encodeURI(text));
		url.searchParams.append(PARAM_LEVEL, level);
	}

	if (deleteIdbCache) {
		url.searchParams.append(PARAM_DELETE_IDB_CACHE, 'true');
	}

	if (nonNullish(msg) || deleteIdbCache) {
		replaceHistory(url);
	}
};

/**
 * If the url contains a msg that has been provided on logout, display it as a toast message. Clean up the url afterwards - we don't want the user to see the message again if reloads the browser
 */
export const displayAndCleanLogoutMsg = async () => {
	const urlParams: URLSearchParams = new URLSearchParams(window.location.search);

	const deleteIdbCache: string | null = urlParams.get(PARAM_DELETE_IDB_CACHE);

	if (deleteIdbCache === 'true') {
		try {
			await deleteIdbAllOisyRelated();
		} catch (err: unknown) {
			console.error('Error deleting cache after logout', err);
		}
	}

	const msg: string | null = urlParams.get(PARAM_MSG);

	if (isNullish(msg)) {
		return;
	}

	// For simplicity reason we assume the level pass as query params is one of the type ToastLevel
	const level: ToastLevel = (urlParams.get(PARAM_LEVEL) as ToastLevel | null) ?? 'success';

	toastsShow({ text: decodeURI(msg), level });

	cleanUpMsgUrl();
};

const cleanUpMsgUrl = () => {
	const url: URL = new URL(window.location.href);

	url.searchParams.delete(PARAM_MSG);
	url.searchParams.delete(PARAM_LEVEL);
	url.searchParams.delete(PARAM_DELETE_IDB_CACHE);

	replaceHistory(url);
};

/**
 * Track sign-out events with optional metadata
 */

const trackSignOut = ({
	name,
	meta = {}
}: {
	name: string;
	meta?: {
		reason?: string;
		level?: 'warn' | 'error';
		text?: string;
		source?: string;
		resetUrl?: boolean;
		clearStorages?: boolean;
	};
}) => {
	trackEvent({
		name,
		metadata: {
			reason: meta.reason ?? 'user',
			level: meta.level ?? '',
			text: meta.text ?? '',
			source: meta.source ?? 'app',
			resetUrl: `${meta.resetUrl ?? false}`,
			clearStorages: `${meta.clearStorages ?? true}`
		}
	});
};
