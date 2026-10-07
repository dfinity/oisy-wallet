import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
import { send as executeSend } from '$eth/services/send.services';
import type { FeeStoreData } from '$eth/stores/eth-fee.store';
import type { OptionEthAddress } from '$eth/types/address';
import type { SendParams } from '$eth/types/send';
import type { EthWalletConnectRefusal } from '$eth/types/wallet-connect';
import {
	classifyWalletConnectEthCall,
	findWalletConnectEthErc20Token,
	getSendParamsGas,
	getSignParamsMessageHex,
	getSignParamsMessageTypedDataV4Hash,
	isEthSignTypedDataMethod,
	isWalletConnectEthErc20Call,
	walletConnectEthRefusals
} from '$eth/utils/wallet-connect.utils';
import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
import { signMessage as signMessageApi, signPrehash } from '$lib/api/signer.api';
import {
	TRACK_COUNT_WC_ETH_SEND_ERROR,
	TRACK_COUNT_WC_ETH_SEND_SUCCESS
} from '$lib/constants/analytics.constants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSend, ProgressStepsSign } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { trackWalletConnectUncheckedSigning } from '$lib/services/wallet-connect-analytics.services';
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
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isWalletConnectDomainFlagged } from '$lib/utils/wallet-connect.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

type WalletConnectSendParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionEthAddress;
	fee: FeeStoreData;
	modalNext: () => void;
	amount: bigint;
	// The refusals the user signed past on the review, which the Settings switch allows. Empty unless
	// the review offered it and its box was ticked. A refusal found here that is not in the list still
	// refuses, so an acknowledgement covers what the review showed and nothing else.
	acknowledgedRefusals: EthWalletConnectRefusal[];
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
	acknowledgedRefusals,
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
						unlisted_token,
						unverifiable_request
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

			// The review refuses what follows, and the signing checks again rather than trusting that it
			// did, the same way for every request.
			const call = classifyWalletConnectEthCall(firstParam.data);

			// A token the wallet does not list is never signed past: adding it is what makes the request
			// reviewable, which is what the review tells the user to do.
			if (
				isWalletConnectEthErc20Call(call) &&
				isNullish(
					findWalletConnectEthErc20Token({
						tokens: get(ercFungibleTokens),
						destination: firstParam.to,
						networkId: sourceNetwork.id
					})
				)
			) {
				toastsError({
					msg: { text: unlisted_token }
				});
				return { success: false };
			}

			// A site WalletConnect's domain verification flags is never signed past, whatever the review
			// handed on: the review offers no way out for one, so no acknowledgement for it can be real.
			const acknowledged = isWalletConnectDomainFlagged(request.verifyContext)
				? []
				: acknowledgedRefusals;

			const refusals = walletConnectEthRefusals({ call, data: firstParam.data });

			if (refusals.some((refusal) => !acknowledged.includes(refusal))) {
				toastsError({
					msg: { text: unverifiable_request }
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

				if (refusals.length > 0) {
					trackWalletConnectUncheckedSigning({
						modifier: 'sign',
						network: sourceNetwork.id.description ?? sourceNetwork.name,
						reasons: refusals
					});
				}

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
