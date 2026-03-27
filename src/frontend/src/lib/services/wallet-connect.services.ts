import { ethAddress, solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
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
import { walletConnectListenerStore } from '$lib/stores/wallet-connect.store';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener, WalletConnectListener } from '$lib/types/wallet-connect';
import { isNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
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
	await disconnectListener();

	try {
		// Connect and disconnect buttons are disabled until at least one of the address is loaded; therefore, this should never happen.
		if (isNullish(get(ethAddress)) && isNullish(get(solAddressMainnet))) {
			toastsError({
				msg: { text: get(i18n).send.assertion.address_unknown }
			});
			return;
		}

		const newListener = await WalletConnectClient.init({
			ethAddress: get(ethAddress),
			solAddressMainnet: get(solAddressMainnet),
			solAddressDevnet: get(solAddressDevnet)
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
					resetListener();

					onSessionDeleteCallback?.();
				}
			}),
		onSessionRequest: (sessionRequest: WalletKitTypes.SessionRequest) =>
			onSessionRequest({ listener: newListener, sessionRequest })
	});

	try {
		await newListener.pair(uri);
	} catch (err: unknown) {
		newListener.detachHandlers();

		resetListener();

		toastsError({
			msg: { text: get(i18n).wallet_connect.error.unexpected_pair },
			err
		});

		modalStore.close();

		return { result: 'critical' };
	}

	return { result: 'success' };
};
