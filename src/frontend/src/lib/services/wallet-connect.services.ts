import { busy } from '$lib/stores/busy.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { isNullish } from '@dfinity/utils';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';

export type CallBackParams = {
	request: Web3WalletTypes.SessionRequest;
	listener: WalletConnectListener;
};

export type RejectParams = Pick<CallBackParams, 'request'> & {
	listener: WalletConnectListener | null | undefined;
};

export const reject = (params: RejectParams): Promise<{ success: boolean; err?: unknown }> =>
	execute({
		params,
		callback: async ({ request, listener }: CallBackParams) => {
			busy.start();

			const { id, topic } = request;

			try {
				await listener.rejectRequest({ topic, id });
			} finally {
				busy.stop();
			}
		},
		toastMsg: 'WalletConnect request rejected.'
	});

export const execute = async ({
	params: { request, listener },
	callback,
	toastMsg
}: {
	params: RejectParams;
	callback: (params: CallBackParams) => Promise<void>;
	toastMsg: string;
}): Promise<{ success: boolean; err?: unknown }> => {
	if (isNullish(listener)) {
		toastsError({
			msg: { text: `Unexpected error: No connection opened.` }
		});
		return { success: false };
	}

	if (isNullish(request)) {
		toastsError({
			msg: { text: `Unexpected error: Request is not defined therefore cannot be processed.` }
		});
		return { success: false };
	}

	try {
		await callback({ request, listener });

		toastsShow({
			text: toastMsg,
			level: 'info',
			duration: 2000
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: `Unexpected error while processing the request with WalletConnect.` },
			err
		});
		return { success: false, err };
	}

	return { success: true };
};
