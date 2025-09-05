import { send as executeSend } from '$eth/services/send.services';
import type { FeeStoreData } from '$eth/stores/eth-fee.store';
import type { SendParams } from '$eth/types/send';
import {
	getSignParamsMessageHex,
	getSignParamsMessageTypedDataV4Hash
} from '$eth/utils/wallet-connect.utils';
import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import {
	TRACK_COUNT_WC_ETH_SEND_ERROR,
	TRACK_COUNT_WC_ETH_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSend, ProgressStepsSign } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import {
	execute,
	type WalletConnectCallBackParams,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

type WalletConnectSendParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionEthAddress;
	fee: FeeStoreData;
	modalNext: () => void;
	amount: bigint;
} & SendParams;

type WalletConnectSignMessageParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
};

export const send = ({
	address,
	fee,
	modalNext,
	token,
	progress,
	amount,
	lastProgressStep = ProgressStepsSend.DONE,
	identity,
	minterInfo,
	sourceNetwork,
	targetNetwork,
	...params
}: WalletConnectSendParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
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

			const { valid } = assertCkEthMinterInfoLoaded({
				minterInfo,
				network: targetNetwork
			});

			if (!valid) {
				return { success: false };
			}

			const {
				send: {
					assertion: { gas_fees_not_defined, max_gas_fee_per_gas_undefined }
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
					msg: { text: max_gas_fee_per_gas_undefined }
				});
				return { success: false };
			}

			const { to, gas: gasWC, data } = firstParam as { to: string; gas?: string; data?: string };

			modalNext();

			try {
				const { hash } = await executeSend({
					from: address,
					to,
					progress,
					lastProgressStep: ProgressStepsSend.APPROVE,
					token,
					amount,
					maxFeePerGas,
					maxPriorityFeePerGas,
					gas: nonNullish(gasWC) ? BigInt(gasWC) : gas,
					data,
					identity,
					minterInfo,
					sourceNetwork,
					targetNetwork
				});

				await listener.approveRequest({ id, topic, message: hash });

				progress?.(lastProgressStep);

				trackEvent({
					name: TRACK_COUNT_WC_ETH_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true };
			} catch (err: unknown) {
				trackEvent({
					name: TRACK_COUNT_WC_ETH_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: replacePlaceholders(get(i18n).wallet_connect.info.transaction_executed, {
			$method: params.request.params.request.method
		})
	});

export const signMessage = ({
	modalNext,
	progress,
	...params
}: WalletConnectSignMessageParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<ResultSuccess> => {
			const {
				id,
				topic,
				params: {
					request: { params }
				}
			} = request;

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				const sign = (params: string[]): Promise<string> => {
					const { identity } = get(authStore);

					try {
						const hash = getSignParamsMessageTypedDataV4Hash(params);
						return signPrehash({
							hash,
							identity,
							nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
						});
					} catch (_err: unknown) {
						// If the above failed, it's because JSON.parse throw an exception.
						// We are assuming that it did so because it tried to parse a string that does not represent an object.
						// Therefore, we continue with a message as hex string.
						const message = getSignParamsMessageHex(params);
						return signMessageApi({
							message,
							identity,
							nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
						});
					}
				};

				const signedMessage = await sign(params);

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({ topic, id, message: signedMessage });

				progress(ProgressStepsSign.DONE);

				return { success: true };
			} catch (err: unknown) {
				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.sign_executed
	});
