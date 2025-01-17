import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSign } from '$lib/enums/progress-steps';
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
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { SESSION_REQUEST_SOL_SIGN_TRANSACTION } from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { sendSol, signSol, signTransaction } from '$sol/services/sol-send.services';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage,
	transactionMessageHasBlockhashLifetime
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { address as solAddress } from '@solana/addresses';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	type SignatureDictionary,
	type TransactionPartialSigner
} from '@solana/signers';
import { type Transaction } from '@solana/transactions';
import { get } from 'svelte/store';

interface WalletConnectDecodeTransactionParams {
	base64EncodedTransactionMessage: string;
	networkId: NetworkId;
}

type WalletConnectSignTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	modalNext: () => void;
	progress: (step: ProgressStepsSign) => void;
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

export const decode = async ({
	base64EncodedTransactionMessage,
	networkId
}: WalletConnectDecodeTransactionParams) => {
	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	const parsedTransactionMessage = await parseSolBase64TransactionMessage({
		transactionMessage: base64EncodedTransactionMessage,
		rpc: solanaHttpRpc(solNetwork)
	});

	return mapSolTransactionMessage(parsedTransactionMessage);
};

export const sign = ({
	address,
	modalNext,
	token,
	progress,
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
			const {
				id,
				topic,
				params: {
					request: {
						params: { transaction: base64EncodedTransactionMessage }
					}
				}
			} = request;

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
				transactionMessage: base64EncodedTransactionMessage,
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
				progress(ProgressStepsSign.SIGN);

				assertNonNullish(source);

				const rpc = solanaHttpRpc(solNetwork);

				const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, solNetwork];

				const signer: TransactionPartialSigner = {
					address: solAddress(source),
					signTransactions: async (transactions: Transaction[]): Promise<SignatureDictionary[]> =>
						await Promise.all(
							transactions.map(async (transaction) => {
								const signedBytes = await signWithSchnorr({
									identity,
									derivationPath,
									keyId: SOLANA_KEY_ID,
									message: Array.from(transaction.messageBytes)
								});

								return { [source]: Uint8Array.from(signedBytes) } as SignatureDictionary;
							})
						)
				};

				assertIsTransactionSigner(signer);
				assertIsTransactionPartialSigner(signer);

				const transactionMessage = await parseSolBase64TransactionMessage({
					transactionMessage: base64EncodedTransactionMessage,
					rpc
				});

				// It should not happen, since we receive transaction with blockhash lifetime, but just to guarantee the correct casting
				if (!transactionMessageHasBlockhashLifetime(transactionMessage)) {
					// throw new Error('Blockhash not found in transaction message lifetime constraint');
					return { success: false };
				}

				progress(ProgressStepsSign.SIGN);

				const { signature } = await signTransaction({
					transactionMessage
				});

				progress(ProgressStepsSign.APPROVE);

				await listener.approveRequest({ id, topic, message: signature });

				progress(ProgressStepsSign.DONE);

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
