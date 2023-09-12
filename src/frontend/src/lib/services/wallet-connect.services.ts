import { SendStep } from '$lib/enums/steps';
import { send as executeSend, type SendParams } from '$lib/services/send.services';
import type { AddressData } from '$lib/stores/address.store';
import { busy } from '$lib/stores/busy.store';
import type { FeeStoreData } from '$lib/stores/fee.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';

export type WalletConnectCallBackParams = {
	request: Web3WalletTypes.SessionRequest;
	listener: WalletConnectListener;
};

export type WalletConnectExecuteParams = Pick<WalletConnectCallBackParams, 'request'> & {
	listener: WalletConnectListener | null | undefined;
};

export type WalletConnectSendParams = WalletConnectExecuteParams & {
	listener: WalletConnectListener | null | undefined;
	address: AddressData;
	fee: FeeStoreData;
	modalNext: () => void;
	amount: BigNumber;
} & SendParams;

export const reject = (
	params: WalletConnectExecuteParams
): Promise<{ success: boolean; err?: unknown }> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<{ success: boolean; err?: unknown }> => {
			busy.start();

			const { id, topic } = request;

			try {
				await listener.rejectRequest({ topic, id });

				return { success: true };
			} finally {
				busy.stop();
			}
		},
		toastMsg: 'WalletConnect request rejected.'
	});

export const send = ({
	address,
	fee,
	modalNext,
	token,
	progress,
	amount,
	lastProgressStep = SendStep.DONE,
	...params
}: WalletConnectSendParams): Promise<{ success: boolean; err?: unknown }> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<{ success: boolean; err?: unknown }> => {
			const { id, topic } = request;

			const firstParam = request?.params.request.params?.[0];

			if (isNullish(firstParam)) {
				toastsError({
					msg: { text: `Unknown parameter.` }
				});
				return { success: false };
			}

			if (isNullish(address)) {
				toastsError({
					msg: { text: `Unexpected error. Your wallet address is not initialized.` }
				});
				return { success: false };
			}

			if (firstParam.from?.toLowerCase() !== address.toLowerCase()) {
				toastsError({
					msg: {
						text: `From address requested for the transaction is not the address of this wallet.`
					}
				});
				return { success: false };
			}

			if (isNullish(firstParam.to)) {
				toastsError({
					msg: { text: `Unknown destination address.` }
				});
				return { success: false };
			}

			if (isNullish(fee)) {
				toastsError({
					msg: { text: `Gas fees are not defined.` }
				});
				return { success: false };
			}

			const { maxFeePerGas, maxPriorityFeePerGas, gas } = fee;

			if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				toastsError({
					msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
				});
				return { success: false };
			}

			const { to, gas: gasWC, data } = firstParam;

			modalNext();

			try {
				const { hash } = await executeSend({
					from: address,
					to,
					progress,
					lastProgressStep: SendStep.APPROVE,
					token,
					amount,
					maxFeePerGas,
					maxPriorityFeePerGas,
					gas: nonNullish(gasWC) ? BigNumber.from(gasWC) : gas,
					data
				});

				await listener.approveRequest({ id, topic, message: hash });

				progress(lastProgressStep);

				return { success: true };
			} catch (err: unknown) {
				// TODO: better error rejection
				await listener.rejectRequest({ topic, id });

				throw err;
			}
		},
		toastMsg: 'WalletConnect eth_sendTransaction request executed.'
	});

export const execute = async ({
	params: { request, listener },
	callback,
	toastMsg
}: {
	params: WalletConnectExecuteParams;
	callback: (params: WalletConnectCallBackParams) => Promise<{ success: boolean; err?: unknown }>;
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
			msg: { text: `Unexpected error while processing the request with WalletConnect.` },
			err
		});
		return { success: false, err };
	}

	return { success: true };
};
