import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet,
	ethAddress,
	solAddressDevnet,
	solAddressMainnet
} from '$lib/derived/address.derived';
import { authIdentity } from '$lib/derived/auth.derived';
import { WalletConnectClient } from '$lib/providers/wallet-connect.providers';
import {
	onSessionDelete,
	onSessionProposal,
	onSessionRequest
} from '$lib/services/wallet-connect-handlers.services';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import {
	walletConnectListenerStore,
	walletConnectSessionsStore
} from '$lib/stores/wallet-connect.store';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener, WalletConnectListener } from '$lib/types/wallet-connect';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import type { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { get } from 'svelte/store';

export interface WalletConnectCallBackParams {
	request: WalletKitTypes.SessionRequest;
	listener: WalletConnectListener;
}

export type WalletConnectExecuteParams = Pick<WalletConnectCallBackParams, 'request'> & {
	listener: OptionWalletConnectListener;
};

export const execute = async ({
	params: { request, listener },
	callback,
	toastMsg
}: {
	params: WalletConnectExecuteParams;
	callback: (params: WalletConnectCallBackParams) => Promise<ResultSuccess>;
	toastMsg: string;
}): Promise<ResultSuccess> => {
	const {
		wallet_connect: {
			error: { no_connection_opened, request_not_defined, unexpected_processing_request }
		}
	} = get(i18n);

	if (isNullish(listener)) {
		toastsError({
			msg: { text: no_connection_opened }
		});
		return { success: false };
	}

	if (isNullish(request)) {
		toastsError({
			msg: { text: request_not_defined }
		});
		return { success: false };
	}

	try {
		const { success, err } = await callback({ request, listener });

		if (!success) {
			return { success, err };
		}

		toastsShow({
			text: toastMsg,
			level: 'info',
			duration: 2000
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: unexpected_processing_request },
			err
		});
		return { success: false, err };
	}

	return { success: true };
};

export const reject = (params: WalletConnectExecuteParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			busy.start();

			const { id, topic } = request;

			try {
				await listener.rejectRequest({ topic, id, error: getSdkError('USER_REJECTED') });

				return { success: true };
			} finally {
				busy.stop();
			}
		},
		toastMsg: get(i18n).wallet_connect.error.request_rejected
	});

export const resetListener = () => {
	walletConnectListenerStore.reset();
	walletConnectSessionsStore.reset();
};

// Mirror the listener's active sessions into the reactive sessions store and return them. Called
// whenever sessions are added or removed, since the persistent listener reference no longer changes.
export const syncSessions = (): SessionTypes.Struct[] => {
	const listener = get(walletConnectListenerStore);

	const sessions = isNullish(listener) ? [] : Object.values(listener.getActiveSessions());

	walletConnectSessionsStore.set(sessions);

	return sessions;
};

// Tear down the listener only when no sessions remain, leaving it (and its handlers) alive while
// other dApps are still connected. Handlers are detached before reset because they live on the
// singleton WalletKit emitter and a later listener instance cannot remove a previous one's handlers.
export const resetListenerIfNoSessions = (): SessionTypes.Struct[] => {
	const sessions = syncSessions();

	if (sessions.length === 0) {
		get(walletConnectListenerStore)?.detachHandlers();

		resetListener();
	}

	return sessions;
};

export const disconnectListener = async () => {
	try {
		const listener = get(walletConnectListenerStore);

		if (isNullish(listener)) {
			return;
		}

		listener.detachHandlers();

		await listener.disconnect();
	} catch (err: unknown) {
		toastsError({
			msg: {
				text: get(i18n).wallet_connect.error.disconnect
			},
			err
		});
	}

	resetListener();
};

const initListener = async (): Promise<OptionWalletConnectListener> => {
	// Reuse the existing listener so adding a connection does not tear down the already-connected
	// dApps. The listener wraps the singleton WalletKit, so it can pair the new URI directly; the
	// caller re-attaches handlers (which detach-first, making re-attach idempotent).
	const existingListener = get(walletConnectListenerStore);

	if (nonNullish(existingListener)) {
		return existingListener;
	}

	try {
		// Connect and disconnect buttons are disabled until at least one of the address is loaded; therefore, this should never happen.
		if (
			isNullish(get(ethAddress)) &&
			isNullish(get(solAddressMainnet)) &&
			isNullish(get(btcAddressMainnet)) &&
			isNullish(get(btcAddressTestnet)) &&
			isNullish(get(btcAddressRegtest))
		) {
			toastsError({
				msg: { text: get(i18n).send.assertion.address_unknown }
			});
			return;
		}

		const newListener = await WalletConnectClient.init({
			ethAddress: get(ethAddress),
			solAddressMainnet: get(solAddressMainnet),
			solAddressDevnet: get(solAddressDevnet),
			btcAddressMainnet: get(btcAddressMainnet),
			btcAddressTestnet: get(btcAddressTestnet),
			btcAddressRegtest: get(btcAddressRegtest),
			btcPrincipal: get(authIdentity)?.getPrincipal(),
			// Keep any sessions persisted from a previous tab/refresh on this cold-start path, mirroring
			// the reconnect path. The add path never reaches here while a listener already exists.
			cleanSlate: false
		});

		walletConnectListenerStore.set(newListener);

		return newListener;
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).wallet_connect.error.connect },
			err
		});

		resetListener();
	}
};

// Disconnect a single connected dApp by topic, leaving the others connected. When the last app is
// removed, fall through to a full teardown so the subsystem is reset cleanly (no leftover pairings).
export const disconnectSession = async (topic: string): Promise<ResultSuccess> => {
	const listener = get(walletConnectListenerStore);

	if (isNullish(listener)) {
		return { success: false };
	}

	try {
		await listener.disconnectSession(topic);
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).wallet_connect.error.disconnect },
			err
		});

		return { success: false };
	}

	if (syncSessions().length === 0) {
		await disconnectListener();
	}

	return { success: true };
};

export const connectListener = async ({
	uri,
	onSessionDeleteCallback
}: {
	uri: string;
	onSessionDeleteCallback?: () => void;
}): Promise<{ result: 'success' | 'error' | 'critical' }> => {
	const newListener = await initListener();

	if (isNullish(newListener)) {
		return { result: 'error' };
	}

	newListener.attachHandlers({
		onSessionProposal,
		onSessionDelete: () =>
			onSessionDelete({
				listener: newListener,
				callback: () => {
					// Only one session ended — keep the listener alive if other dApps are still connected.
					resetListenerIfNoSessions();

					onSessionDeleteCallback?.();
				}
			}),
		onSessionRequest: (sessionRequest: WalletKitTypes.SessionRequest) =>
			onSessionRequest({ listener: newListener, sessionRequest })
	});

	try {
		await newListener.pair(uri);
	} catch (err: unknown) {
		// A failed pairing must not drop already-connected dApps: only tear down when none remain.
		resetListenerIfNoSessions();

		toastsError({
			msg: { text: get(i18n).wallet_connect.error.unexpected_pair },
			err
		});

		modalStore.close();

		return { result: 'critical' };
	}

	return { result: 'success' };
};
