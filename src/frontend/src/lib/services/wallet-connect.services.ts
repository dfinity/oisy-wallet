import { signMessage as signMessageApi, signPrehash } from '$lib/api/backend.api';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { SendStep, SignStep } from '$lib/enums/steps';
import { send as executeSend, type SendParams } from '$lib/services/send.services';
import type { AddressData } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import type { FeeStoreData } from '$lib/stores/fee.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import {
	getSignParamsMessageHex,
	getSignParamsMessageTypedDataV4Hash
} from '$lib/utils/wallet-connect.utils';
import { isNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { getSdkError } from '@walletconnect/utils';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';
import { get } from 'svelte/store';

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

export type WalletConnectSignMessageParams = WalletConnectExecuteParams & {
	listener: WalletConnectListener | null | undefined;
	modalNext: () => void;
	progress: (step: SignStep) => void;
};

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
				await listener.rejectRequest({ topic, id, error: getSdkError('USER_REJECTED') });

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

			const { to, data } = firstParam;

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
					gas,
					data
				});

				await listener.approveRequest({ id, topic, message: hash });

				progress(lastProgressStep);

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: 'WalletConnect eth_sendTransaction request executed.'
	});

export const signMessage = ({
	modalNext,
	progress,
	...params
}: WalletConnectSignMessageParams): Promise<{ success: boolean; err?: unknown }> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<{ success: boolean; err?: unknown }> => {
			const {
				id,
				topic,
				params: {
					request: { params }
				}
			} = request;

			modalNext();

			try {
				progress(SignStep.SIGN);

				const sign = (params: string[]): Promise<string> => {
					const { identity } = get(authStore);

					try {
						const hash = getSignParamsMessageTypedDataV4Hash(params);
						return signPrehash({ hash, identity });
					} catch (err: unknown) {
						// If the above failed, it's because JSON.parse throw an exception.
						// We are assuming that it did so because it tried to parse a string that does not represent an object.
						// Therefore, we continue with a message as hex string.
						const message = getSignParamsMessageHex(params);
						return signMessageApi({ message, identity });
					}
				};

				const signedMessage = await sign(params);

				progress(SignStep.APPROVE);

				await listener.approveRequest({ topic, id, message: signedMessage });

				progress(SignStep.DONE);

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: `WalletConnect sign request executed.`
	});

const execute = async ({
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
