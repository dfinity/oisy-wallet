import {
	TRACK_COUNT_WC_SOL_SEND_ERROR,
	TRACK_COUNT_WC_SOL_SEND_SUCCESS
} from '$lib/constants/analytics.constants';
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
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import {
	sendSignedTransaction,
	setLifetimeAndFeePayerToTransaction
} from '$sol/services/sol-send.services';
import { signTransaction as executeSign } from '$sol/services/sol-sign.services';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import { safeMapNetworkIdToNetwork } from '$sol/utils/safe-network.utils';
import { createSigner, signTransaction, type CreateSignerParams } from '$sol/utils/sol-sign.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	getBase58Decoder,
	getBase64Decoder,
	getTransactionEncoder,
	isTransactionMessageWithBlockhashLifetime,
	address as solAddress,
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

const getSignatureWithoutSending = async ({
	identity,
	base64EncodedTransactionMessage,
	address,
	network
}: CreateSignerParams & { base64EncodedTransactionMessage: string }): Promise<string> => {
	const decodedTransactionMessage = decodeTransactionMessage(base64EncodedTransactionMessage);

	const signaturesMap = await signTransaction({
		identity,
		transaction: decodedTransactionMessage,
		address,
		network
	});

	const customSign = signaturesMap[solAddress(address)];

	return getBase58Decoder().decode(customSign);
};

const getSignatureWithSending = async ({
	identity,
	base64EncodedTransactionMessage,
	address,
	network,
	progress
}: {
	identity: OptionIdentity;
	base64EncodedTransactionMessage: string;
	address: SolAddress;
	network: SolanaNetworkType;
	progress: (step: ProgressStepsSign | ProgressStepsSendSol.SEND) => void;
}): Promise<string | undefined> => {
	const { signatures } = decodeTransactionMessage(base64EncodedTransactionMessage);

	const additionalSigners = Object.entries(signatures).reduce<string[]>(
		(acc, [a, signature]) => [...acc, ...(a !== address && isNullish(signature) ? [a] : [])],
		[]
	);

	// We cannot send transaction with additional signers that have not signed yet
	if (additionalSigners.length > 0) {
		console.warn(
			`WalletConnect Solana transaction has additional signers that have not signed yet: ${additionalSigners}`
		);

		return;
	}

	const rpc = solanaHttpRpc(network);

	const transactionMessageRaw = await parseSolBase64TransactionMessage({
		transactionMessage: base64EncodedTransactionMessage,
		rpc
	});

	// It should not happen, since we receive transaction with blockhash lifetime,
	// but just to guarantee the correct type casting
	if (!isTransactionMessageWithBlockhashLifetime(transactionMessageRaw)) {
		console.warn(
			'WalletConnect Solana transaction does not have blockhash lifetime, cannot be sent'
		);

		return;
	}

	const signer = createSigner({
		identity,
		address,
		network
	});

	const transactionMessage = await setLifetimeAndFeePayerToTransaction({
		transactionMessage: transactionMessageRaw,
		rpc,
		feePayer: signer
	});

	const { signedTransaction, signature } = await executeSign(transactionMessage);

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

	progress(ProgressStepsSendSol.SEND);

	await sendSignedTransaction({ rpc, signedTransaction });

	return signature;
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

				const signature =
					method === SESSION_REQUEST_SOL_SIGN_TRANSACTION
						? await getSignatureWithoutSending({
								identity,
								base64EncodedTransactionMessage,
								address,
								network: solNetwork
							})
						: method === SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
							? await getSignatureWithSending({
									identity,
									base64EncodedTransactionMessage,
									address,
									network: solNetwork,
									progress
								})
							: undefined;

				if (isNullish(signature)) {
					return { success: false };
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
