import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.contants';
import { UNEXPECTED_ERROR } from '$lib/constants/wallet-connect.constants';
import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
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
import { SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION } from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import {
	sendSignedTransaction,
	setLifetimeAndFeePayerToTransaction
} from '$sol/services/sol-send.services';
import { signTransaction } from '$sol/services/sol-sign.services';
import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
import { createSigner } from '$sol/utils/sol-sign.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage,
	transactionMessageHasBlockhashLifetime
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import {
	addSignersToTransactionMessage,
	getBase64Decoder,
	getTransactionEncoder,
	type Base64EncodedWireTransaction
} from '@solana/kit';
import { get } from 'svelte/store';

interface WalletConnectDecodeTransactionParams {
	base64EncodedTransactionMessage: string;
	networkId: NetworkId;
}

type WalletConnectSignTransactionParams = WalletConnectExecuteParams & {
	listener: OptionWalletConnectListener;
	address: OptionSolAddress;
	modalNext: () => void;
	progress: (step: ProgressStepsSign | ProgressStepsSendSol.SEND) => void;
	token: Token;
	identity: OptionIdentity;
};

export const decode = async ({
	base64EncodedTransactionMessage,
	networkId
}: WalletConnectDecodeTransactionParams) => {
	const solNetwork = safeMapNetworkIdToNetwork(networkId);

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
						method,
						params: { transaction: base64EncodedTransactionMessage }
					}
				}
			} = request;

			const {
				network: { id: networkId }
			} = token;

			if (isNullish(address)) {
				toastsError({
					msg: { text: get(i18n).wallet_connect.error.wallet_not_initialized }
				});
				return { success: false };
			}

			const solNetwork = safeMapNetworkIdToNetwork(networkId);

			const parsedTransactionMessage = await parseSolBase64TransactionMessage({
				transactionMessage: base64EncodedTransactionMessage,
				rpc: solanaHttpRpc(solNetwork)
			});

			const { amount, destination } = mapSolTransactionMessage(parsedTransactionMessage);

			// TODO: add assertions checks about amount, payer, source and destination when we will able to properly parse them for ALL the transactions

			modalNext();

			try {
				progress(ProgressStepsSign.SIGN);

				assertNonNullish(address);

				const rpc = solanaHttpRpc(solNetwork);

				const signer = createSigner({
					identity,
					address,
					network: solNetwork
				});

				const transactionMessageRaw = await parseSolBase64TransactionMessage({
					transactionMessage: base64EncodedTransactionMessage,
					rpc
				});

				// It should not happen, since we receive transaction with blockhash lifetime, but just to guarantee the correct type casting
				if (!transactionMessageHasBlockhashLifetime(transactionMessageRaw)) {
					return { success: false };
				}

				const { signatures } = decodeTransactionMessage(base64EncodedTransactionMessage);
				const additionalSigners = Object.keys(signatures)
					.filter((a) => a !== address)
					.map((signer) =>
						createSigner({
							identity,
							address: signer,
							network: solNetwork
						})
					);
				const transactionMessageWithAllSigners = addSignersToTransactionMessage(
					additionalSigners,
					transactionMessageRaw
				);

				const transactionMessage = await setLifetimeAndFeePayerToTransaction({
					transactionMessage: transactionMessageWithAllSigners,
					rpc,
					feePayer: signer
				});

				const { signedTransaction, signature } = await signTransaction(transactionMessage);

				const transactionBytes = getBase64Decoder().decode(
					getTransactionEncoder().encode(signedTransaction)
				);

				const { simulateTransaction } = rpc;

				const simulationResult = await simulateTransaction(
					transactionBytes as Base64EncodedWireTransaction,
					{
						encoding: 'base64'
					}
				).send();

				if (nonNullish(simulationResult.value.err)) {
					// In case of simulation error, it is useful to log the error to the console for development purposes
					console.warn('WalletConnect Solana transaction simulation error', simulationResult);
				}

				if (method === SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION) {
					progress(ProgressStepsSendSol.SEND);
				}

				try {
					// Even if some DEXs send an only-sign transaction, they do not send it when we return it.
					// So, for good measure, we will send it anyway. It is not an issue if it is sent twice, since only one will pass.
					// Plus, if it requires more signatures on the DEX's side, it will be sent again by them and it will fail with us.
					sendSignedTransaction({ rpc, signedTransaction });
				} catch (err: unknown) {
					// If the transaction requires that we send it, and it fails, we reject the request, otherwise we just log the error
					if (method !== SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION) {
						console.warn('WalletConnect Solana transaction send error', err);
					}
				}

				progress(ProgressStepsSign.APPROVE_WALLET_CONNECT);

				await listener.approveRequest({
					id,
					topic,
					message: { signature }
				});

				progress(ProgressStepsSign.DONE);

				trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_SUCCESS,
					metadata: {
						token: token.symbol
					}
				});

				return { success: true, amount, destination };
			} catch (err: unknown) {
				trackEvent({
					name: TRACK_COUNT_WC_SOL_SEND_ERROR,
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
