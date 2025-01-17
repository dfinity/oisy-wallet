import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	execute,
	type WalletConnectCallBackParams,
	type WalletConnectExecuteParams
} from '$lib/services/wallet-connect.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { SESSION_REQUEST_SOL_SIGN_TRANSACTION } from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol, signSol } from '$sol/services/sol-send.services';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

type WalletConnectSignTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	transactionMessage: string;
	modalNext: () => void;
	onProgress: () => void;
	token: Token;
	identity: OptionIdentity;
};

type WalletConnectSignAndSendTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	modalNext: () => void;
	amount: BigNumber;
	onProgress: () => void;
	token: Token;
	identity: OptionIdentity;
};

export const signTransaction = ({
	address,
	transactionMessage,
	modalNext,
	token,
	onProgress,
	identity,
	...params
}: WalletConnectSignTransactionParams): Promise<ResultSuccess> =>
	execute({
		params,
		callback: async ({
			request,
			listener
		}: WalletConnectCallBackParams): Promise<
			ResultSuccess & {
				amount?: bigint;
				destination?: SolAddress;
			}
		> => {
			const { id, topic } = request;

			const {
				network: { id: networkId }
			} = token;

			const {
				wallet_connect: {
					error: { wallet_not_initialized, from_address_not_wallet, unknown_destination }
				}
			} = get(i18n);

			if (isNullish(address)) {
				toastsError({
					msg: { text: wallet_not_initialized }
				});
				return { success: false };
			}

			const solNetwork = mapNetworkIdToNetwork(networkId);

			assertNonNullish(
				solNetwork,
				replacePlaceholders(get(i18n).init.error.no_solana_network, {
					$network: networkId.description ?? ''
				})
			);

			const parsedTransactionMessage = await parseSolBase64TransactionMessage({
				transactionMessage,
				rpc: solanaHttpRpc(solNetwork)
			});

			const { amount, payer, source, destination } =
				mapSolTransactionMessage(parsedTransactionMessage);

			if (
				source?.toLowerCase() !== address.toLowerCase() &&
				payer?.toLowerCase() !== address.toLowerCase()
			) {
				toastsError({
					msg: {
						text: from_address_not_wallet
					}
				});
				return { success: false };
			}

			if (isNullish(destination)) {
				toastsError({
					msg: { text: unknown_destination }
				});
				return { success: false };
			}

			modalNext();

			try {
				const signature = await signSol({
					identity,
					token,
					amount: parseToken({
						value: `${amount}`,
						unitName: token.decimals
					}),
					destination,
					source: address,
					onProgress
				});

				await listener.approveRequest({ id, topic, message: signature });

				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true, amount, destination };
			} catch (err: unknown) {
				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.sol_transaction_executed
	});

export const signAndSendTransaction = ({
	address,
	modalNext,
	token,
	onProgress,
	amount,
	identity,
	...params
}: WalletConnectSignAndSendTransactionParams): Promise<ResultSuccess> =>
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
					request: { method }
				}
			} = request;

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

			const { to } = firstParam;

			modalNext();

			const executeSend = method === SESSION_REQUEST_SOL_SIGN_TRANSACTION ? signSol : sendSol;

			try {
				await executeSend({
					identity,
					token,
					amount: parseToken({
						value: `${amount}`,
						unitName: token.decimals
					}),
					destination: to,
					source: address,
					onProgress
				});

				// TODO: shall we provide the signature as `message` returned
				await listener.approveRequest({ id, topic, message: '' });

				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true };
			} catch (err: unknown) {
				await trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
					metadata: {
						token: token.symbol
					}
				});

				await listener.rejectRequest({ topic, id, error: UNEXPECTED_ERROR });

				throw err;
			}
		},
		toastMsg: get(i18n).wallet_connect.info.sol_transaction_executed
	});
