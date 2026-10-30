import { send as executeSend } from '$eth/services/send.services';
import type { FeeStoreData } from '$eth/stores/eth-fee.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { SendParams } from '$eth/types/send';
import { toastEthereumTransactionError } from '$eth/utils/eth-error.utils';
import {
	classifyWalletConnectEthCall,
	classifyWalletConnectEthSendTransaction,
	getSendParamsGas,
	getSignParamsMessageHex,
	getSignParamsMessageTypedDataV4Hash,
	getWalletConnectEthCkEthDeposit,
	hasUnreviewableTypedData,
	isEthSignTypedDataMethod,
	isWalletConnectEthTokenCallWithValue,
	WalletConnectEthCkEthHelperUnconfirmedError
} from '$eth/utils/wallet-connect.utils';
import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import {
	TRACK_COUNT_WC_ETH_SEND_ERROR,
	TRACK_COUNT_WC_ETH_SEND_SUCCESS
} from '$lib/constants/analytics.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
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
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import { Signature } from 'ethers/crypto';
import { get } from 'svelte/store';

type WalletConnectSendParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionEthAddress;
	fee: FeeStoreData;
	modalNext: () => void;
	amount: bigint;
	// Whether the user ticked, on the review, that they sign a call OISY can't read.
	unknownCallAcknowledged: boolean;
} & SendParams;

type WalletConnectSignMessageParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
	// Whether the user ticked, on the review, that they sign typed data OISY can't describe.
	unreviewableTypedDataAcknowledged: boolean;
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
	unknownCallAcknowledged,
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
						unknown_destination,
						cketh_deposit_refused,
						cketh_helper_unconfirmed,
						unexpected_processing_request
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

			// The review refuses these requests through the same check. Running it here as well, against
			// the minter information the transaction is then prepared with, keeps a refused request from
			// being signed however this is reached.
			try {
				getWalletConnectEthCkEthDeposit({
					to: firstParam.to,
					data: firstParam.data,
					networkId: sourceNetwork.id,
					minterInfo,
					principal: identity?.getPrincipal()
				});
			} catch (err: unknown) {
				toastsError({
					msg: {
						text:
							err instanceof WalletConnectEthCkEthHelperUnconfirmedError
								? cketh_helper_unconfirmed
								: cketh_deposit_refused
					}
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

			// The review refuses a token call that sends native value along with it, and the signing
			// step holds to the same check.
			if (
				isWalletConnectEthTokenCallWithValue({
					call: classifyWalletConnectEthCall(data),
					value: amount
				})
			) {
				toastsError({
					msg: {
						text: replacePlaceholders(get(i18n).wallet_connect.error.token_call_with_value, {
							$amount: `${formatToken({ value: amount, unitName: token.decimals })} ${token.symbol}`
						})
					}
				});
				return { success: false };
			}

			// The review holds Approve on a call OISY can't read until the user confirms they understand
			// that; this is the same condition, asked where the transaction is signed.
			const call = classifyWalletConnectEthSendTransaction({
				to,
				data,
				networkId: sourceNetwork.id,
				minterInfo,
				principal: identity?.getPrincipal()
			});

			if (call.type === 'unknown' && !unknownCallAcknowledged) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.unexplained_request_unconfirmed }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

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
					gas: getSendParamsGas(gasWC) ?? gas,
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

				// Reported here rather than left to the generic toast of `execute`: a refused broadcast
				// carries the signed transaction, which stays valid until its nonce is used.
				toastEthereumTransactionError({
					err,
					fallbackMsg: unexpected_processing_request,
					token,
					context: PLAUSIBLE_EVENT_CONTEXTS.WALLET_CONNECT
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false, err };
			}
		},
		toastMsg: replacePlaceholders(get(i18n).wallet_connect.info.transaction_executed, {
			$method: params.request.params.request.method
		})
	});

export const signMessage = ({
	modalNext,
	progress,
	unreviewableTypedDataAcknowledged,
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
					request: { method, params },
					chainId
				}
			} = request;

			// The review holds Approve on typed data OISY can't describe until the user confirms they
			// understand that; this is the same condition, asked where the signature is made.
			if (
				hasUnreviewableTypedData({ method, params, sessionChainId: chainId }) &&
				!unreviewableTypedDataAcknowledged
			) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.unexplained_request_unconfirmed }
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				return { success: false };
			}

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				const sign = (params: string[]): Promise<string> => {
					const { identity } = get(authStore);

					// The signature scheme is decided by the requested method alone. A
					// payload that parses as EIP-712 must not turn `personal_sign` /
					// `eth_sign` into a typed-data signature: the user approves those as
					// plain messages, and an EIP-712 signature over them would be an
					// executable authorization (e.g. an ERC-2612 permit) they never saw.
					if (isEthSignTypedDataMethod(request.params.request.method)) {
						// Typed-data methods reject on any parse/validate/hash failure, never
						// downgrading to a raw message signature.
						return signPrehash({
							hash: getSignParamsMessageTypedDataV4Hash({
								params,
								// The chain the dApp connected under. Hashing refuses a domain on any
								// other, so a session cannot reach past the network it was granted.
								sessionChainId: request.params.chainId
							}),
							identity,
							nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
						});
					}

					return signMessageApi({
						message: getSignParamsMessageHex(params),
						identity,
						nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
					});
				};

				// The signer ends a signature with the bare y-parity (0 or 1) as `v`, the form an
				// EIP-1559 transaction takes. A signed message goes back to the dApp with `v` as 27 or
				// 28, the only values a contract verifying it on-chain (e.g. an ERC-2612 `permit`)
				// accepts.
				const signedMessage = Signature.from(await sign(params)).serialized;

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
