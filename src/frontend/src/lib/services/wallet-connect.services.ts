import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
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
