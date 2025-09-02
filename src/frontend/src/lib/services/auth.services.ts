import {
	clearIdbBtcAddressMainnet,
	clearIdbEthAddress,
	clearIdbSolAddressMainnet,
	deleteIdbBtcAddressMainnet,
	deleteIdbEthAddress,
	deleteIdbSolAddressMainnet
} from '$lib/api/idb-addresses.api';
import { clearIdbBalances, deleteIdbBalances } from '$lib/api/idb-balances.api';
import {
	clearIdbEthTokens,
	clearIdbEthTokensDeprecated,
	clearIdbIcTokens,
	clearIdbSolTokens,
	deleteIdbEthTokens,
	deleteIdbEthTokensDeprecated,
	deleteIdbIcTokens,
	deleteIdbSolTokens
} from '$lib/api/idb-tokens.api';
import {
	clearIdbBtcTransactions,
	clearIdbEthTransactions,
	clearIdbIcTransactions,
	clearIdbSolTransactions,
	deleteIdbBtcTransactions,
	deleteIdbEthTransactions,
	deleteIdbIcTransactions,
	deleteIdbSolTransactions
} from '$lib/api/idb-transactions.api';
import {
	TRACK_COUNT_SIGN_IN_SUCCESS,
	TRACK_SIGN_IN_CANCELLED_COUNT,
	TRACK_SIGN_IN_ERROR_COUNT,
	TRACK_SIGN_IN_UNDEFINED_AUTH_CLIENT_ERROR,
	TRACK_SIGN_OUT_ERROR,
	TRACK_SIGN_OUT_SUCCESS,
	TRACK_SIGN_OUT_WITH_WARNING
} from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { authStore, type AuthSignInParams } from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsClean, toastsError, toastsShow } from '$lib/stores/toasts.store';
import { AuthClientNotInitializedError } from '$lib/types/errors';
import type { ToastMsg } from '$lib/types/toast';
import { gotoReplaceRoot } from '$lib/utils/nav.utils';
import { replaceHistory } from '$lib/utils/route.utils';
import type { ToastLevel } from '@dfinity/gix-components';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const signIn = async (
	params: AuthSignInParams
): Promise<{ success: 'ok' | 'cancelled' | 'error'; err?: unknown }> => {
	busy.show();

	try {
		await authStore.signIn(params);

		trackEvent({
			name: TRACK_COUNT_SIGN_IN_SUCCESS
		});

		// We clean previous messages in case user was signed out automatically before sign-in again.
		toastsClean();

		return { success: 'ok' };
	} catch (err: unknown) {
		if (err === 'UserInterrupt') {
			trackEvent({
				name: TRACK_SIGN_IN_CANCELLED_COUNT
			});

			// We do not display an error if the user explicitly cancelled the process of sign-in
			return { success: 'cancelled' };
		}

		if (err instanceof AuthClientNotInitializedError) {
			trackEvent({
				name: TRACK_SIGN_IN_UNDEFINED_AUTH_CLIENT_ERROR
			});

			toastsError({
				msg: { text: get(i18n).auth.warning.reload_and_retry }
			});

			return { success: 'error', err };
		}

		trackEvent({
			name: TRACK_SIGN_IN_ERROR_COUNT
		});

		toastsError({
			msg: { text: get(i18n).auth.error.error_while_signing_in },
			err
		});

		return { success: 'error', err };
	} finally {
		busy.stop();
	}
};

export const signOut = ({
	resetUrl = false,
	clearAllPrincipalsStorages = false,
	source = ''
}: {
	resetUrl?: boolean;
	clearAllPrincipalsStorages?: boolean;
	source?: string;
}): Promise<void> => {
	trackSignOut({
		name: TRACK_SIGN_OUT_SUCCESS,
		meta: { reason: 'user', resetUrl, source }
	});
	return logout({ resetUrl, clearAllPrincipalsStorages });
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
	const text = get(i18n).auth.warning.session_expired;
	trackEvent({
		name: TRACK_SIGN_OUT_WITH_WARNING,
		metadata: { level: 'warn', text, reason: 'session_expired', clearStorages: 'false' }
	});
	return logout({
		msg: {
			text: get(i18n).auth.warning.session_expired,
			level: 'warn'
		},
		clearCurrentPrincipalStorages: false
	});
};

export const lockSession = ({ resetUrl = false }: { resetUrl?: boolean }): Promise<void> =>
	logout({
		resetUrl,
		clearCurrentPrincipalStorages: false
	});

const emptyPrincipalIdbStore = async (deleteIdbStore: (principal: Principal) => Promise<void>) => {
	const { identity } = get(authStore);

	if (isNullish(identity)) {
		return;
	}

	try {
		await deleteIdbStore(identity.getPrincipal());
	} catch (err: unknown) {
		// We silence the error.
		// Effective logout is more important here.
		console.error(err);
	}
};

const clearIdbStore = async (clearIdbStore: () => Promise<void>) => {
	try {
		await clearIdbStore();
	} catch (err: unknown) {
		// We silence the error.
		// Effective logout is more important here.
		console.error(err);
	}
};

const deleteIdbStoreList = [
	// Addresses
	deleteIdbBtcAddressMainnet,
	deleteIdbEthAddress,
	deleteIdbSolAddressMainnet,
	// Tokens
	deleteIdbIcTokens,
	// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
	deleteIdbEthTokensDeprecated,
	deleteIdbEthTokens,
	deleteIdbSolTokens,
	// Transactions
	deleteIdbBtcTransactions,
	deleteIdbEthTransactions,
	deleteIdbIcTransactions,
	deleteIdbSolTransactions,
	// Balances
	deleteIdbBalances
];

const clearIdbStoreList = [
	// Addresses
	clearIdbBtcAddressMainnet,
	clearIdbEthAddress,
	clearIdbSolAddressMainnet,
	// Tokens
	clearIdbIcTokens,
	// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
	clearIdbEthTokensDeprecated,
	clearIdbEthTokens,
	clearIdbSolTokens,
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
	sessionStorage.clear();
};

const logout = async ({
	msg = undefined,
	clearCurrentPrincipalStorages = true,
	clearAllPrincipalsStorages = false,
	resetUrl = false
}: {
	msg?: ToastMsg;
	clearCurrentPrincipalStorages?: boolean;
	clearAllPrincipalsStorages?: boolean;
	resetUrl?: boolean;
}) => {
	// To mask not operational UI (a side effect of sometimes slow JS loading after window.reload because of service worker and no cache).
	busy.start();

	if (clearCurrentPrincipalStorages) {
		await Promise.all(deleteIdbStoreList.map(emptyPrincipalIdbStore));
	}
	if (clearAllPrincipalsStorages) {
		await Promise.all(clearIdbStoreList.map(clearIdbStore));
	}

	await clearSessionStorage();

	await authStore.signOut();

	if (msg) {
		appendMsgToUrl(msg);
	}

	if (resetUrl) {
		await gotoReplaceRoot();
	}

	// Auth: Delegation and identity are cleared from indexedDB by agent-js so, we do not need to clear these

	// Preferences: We do not clear local storage as well. It contains anonymous information such as the selected theme.
	// Information the user wants to preserve across sign-in. e.g. if I select the light theme, logout and sign-in again, I am happy if the dapp still uses the light theme.

	// We reload the page to make sure all the states are cleared
	window.location.reload();
};

const PARAM_MSG = 'msg';
const PARAM_LEVEL = 'level';

/**
 * If a message was provided to the logout process - e.g. a message informing the logout happened because the session timed-out - append the information to the url as query params
 */
const appendMsgToUrl = (msg: ToastMsg) => {
	if (typeof window === 'undefined') {
		return;
	}

	const { text, level } = msg;

	const url: URL = new URL(window.location.href);

	url.searchParams.append(PARAM_MSG, encodeURI(text));
	url.searchParams.append(PARAM_LEVEL, level);

	replaceHistory(url);
};

/**
 * If the url contains a msg that has been provided on logout, display it as a toast message. Cleanup url afterwards - we don't want the user to see the message again if reloads the browser
 */
export const displayAndCleanLogoutMsg = () => {
	const urlParams: URLSearchParams = new URLSearchParams(window.location.search);

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
