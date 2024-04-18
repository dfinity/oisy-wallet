import { UNEXPECTED_ERROR } from '$eth/constants/wallet-connect.constants';
import type { FeeStoreData } from '$eth/stores/fee.store';
import type { SendParams } from '$eth/types/send';
import type { WalletConnectListener } from '$eth/types/wallet-connect';
import {
	getSignParamsMessageHex,
	getSignParamsMessageTypedDataV4Hash
} from '$eth/utils/wallet-connect.utils';
import { assertCkEthHelperContractAddressLoaded } from '$icp-eth/services/cketh.services';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/backend.api';
import {
	TRACK_COUNT_WC_ETH_SEND_ERROR,
	TRACK_COUNT_WC_ETH_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { SendStep, SignStep } from '$lib/enums/steps';
import { trackEvent } from '$lib/services/analytics.services';
import { authStore } from '$lib/stores/auth.store';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { OptionAddress } from '$lib/types/address';
import type { TokenStandard } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { getSdkError } from '@walletconnect/utils';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';
import { get } from 'svelte/store';
import { send as executeSend } from './send.services';

export type WalletConnectCallBackParams = {
	request: Web3WalletTypes.SessionRequest;
	listener: WalletConnectListener;
};

export type WalletConnectExecuteParams = Pick<WalletConnectCallBackParams, 'request'> & {
	listener: WalletConnectListener | null | undefined;
};

export type WalletConnectSendParams = WalletConnectExecuteParams & {
	listener: WalletConnectListener | null | undefined;
	address: OptionAddress;
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
		toastMsg: get(i18n).wallet_connect.error.request_rejected
	});

export const send = ({
	address,
	fee,
	modalNext,
	token,
	progress,
	amount,
	lastProgressStep = SendStep.DONE,
	identity,
	ckEthHelperContractAddress,
	tokenStandard,
	sourceNetwork,
	targetNetwork,
	...params
}: WalletConnectSendParams & {
	tokenStandard: TokenStandard;
}): Promise<{ success: boolean; err?: unknown }> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<{ success: boolean; err?: unknown }> => {
			const { id, topic } = request;

			const firstParam = request?.params.request.params?.[0];

			const {
				wallet_connect: {
					error: {
						unknown_parameter,
						wallet_not_initialized,
						from_address_not_wallet,
						unknown_destination
					}
				}
			} = get(i18n);

			if (isNullish(firstParam)) {
				toastsError({
					msg: { text: unknown_parameter }
				});
				return { success: false };
			}

			if (isNullish(address)) {
				toastsError({
					msg: { text: wallet_not_initialized }
				});
				return { success: false };
			}

			if (firstParam.from?.toLowerCase() !== address.toLowerCase()) {
				toastsError({
					msg: {
						text: from_address_not_wallet
					}
				});
				return { success: false };
			}

			if (isNullish(firstParam.to)) {
				toastsError({
					msg: { text: unknown_destination }
				});
				return { success: false };
			}

			const { valid } = assertCkEthHelperContractAddressLoaded({
				tokenStandard,
				helperContractAddress: ckEthHelperContractAddress,
				network: targetNetwork
			});

			if (!valid) {
				return { success: false };
			}

			const {
				send: {
					assertion: { gas_fees_not_defined, max_gas_gee_per_gas_undefined }
				}
			} = get(i18n);

			if (isNullish(fee)) {
				toastsError({
					msg: { text: gas_fees_not_defined }
				});
				return { success: false };
			}

			const { maxFeePerGas, maxPriorityFeePerGas, gas } = fee;

			if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				toastsError({
					msg: { text: max_gas_gee_per_gas_undefined }
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
					data,
					identity,
					ckEthHelperContractAddress,
					sourceNetwork,
					targetNetwork
				});

				await listener.approveRequest({ id, topic, message: hash });

				progress(lastProgressStep);

				await trackEvent({
					name: TRACK_COUNT_WC_ETH_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true };
			} catch (err: unknown) {
				await trackEvent({
					name: TRACK_COUNT_WC_ETH_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.eth_transaction_executed
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
		toastMsg: get(i18n).wallet_connect.info.sign_executed
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
