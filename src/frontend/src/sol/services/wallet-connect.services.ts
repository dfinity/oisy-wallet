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
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import {
	setLifetimeAndFeePayerToTransaction,
	signTransaction
} from '$sol/services/sol-send.services';
import { createSigner } from '$sol/services/sol-sign.services';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage,
	transactionMessageHasBlockhashLifetime
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { getBase58Codec, getBase64Decoder } from '@solana/codecs';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import { addSignersToTransactionMessage } from '@solana/signers';
import {
	assertTransactionIsFullySigned,
	type Base64EncodedWireTransaction
} from '@solana/transactions';
import { getTransactionEncoder, sendAndConfirmTransactionFactory } from '@solana/web3.js';
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

	console.log('parsedTransactionMessage', parsedTransactionMessage);

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
				// return { success: false };
			}

			if (isNullish(destination)) {
				toastsError({
					msg: { text: unknown_destination }
				});
				// return { success: false };
			}

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

				console.log('transactionMessageRaw', transactionMessageRaw);

				// It should not happen, since we receive transaction with blockhash lifetime, but just to guarantee the correct casting
				if (!transactionMessageHasBlockhashLifetime(transactionMessageRaw)) {
					// throw new Error('Blockhash not found in transaction message lifetime constraint');
					return { success: false };
				}

				// const transactionMessage = await setLifetimeAndFeePayerToTransaction({
				// 	transactionMessage: transactionMessageRaw,
				// 	rpc,
				// 	feePayer: signer
				// });

				console.log(
					'transactionMessageRawDecoded',
					decodeTransactionMessage(base64EncodedTransactionMessage)
				);
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
				console.log('transactionMessageWithAllSigners', transactionMessageWithAllSigners);

				const transactionMessage = await setLifetimeAndFeePayerToTransaction({
					transactionMessage: transactionMessageWithAllSigners,
					rpc,
					feePayer: signer
				});

				console.log(
					'transactionMessage after setLifetimeAndFeePayerToTransaction',
					transactionMessage
				);

				progress(ProgressStepsSign.SIGN);

				console.log(
					'transactionMessageFinal',
					transactionMessageWithAllSigners,
					transactionMessage
				);

				const { signedTransaction, signature } = await signTransaction({
					transactionMessage: transactionMessage
				});

				console.log('signature', signature, signedTransaction);

				const bar = getTransactionEncoder().encode(signedTransaction);
				const transactionBytes = getBase64Decoder().decode(bar);
				const bar2 = getBase58Codec().decode(bar);

				console.log('bar', bar, transactionBytes);

				const { simulateTransaction } = rpc;

				const simulationResult = simulateTransaction(
					transactionBytes as Base64EncodedWireTransaction,
					{
						encoding: 'base64'
					}
				);

				console.log('simulationResult', simulationResult);

				progress(ProgressStepsSign.APPROVE);

				// await listener.approveRequest({
				// 	id,
				// 	topic,
				// 	message: { signature, transaction: transactionBytes }
				// });

				const rpcSubscriptions = solanaWebSocketRpc(solNetwork);

				const sendSignedTransaction = async ({
					rpc,
					rpcSubscriptions,
					signedTransaction,
					commitment = 'confirmed'
				}: {
					rpc: Rpc<SolanaRpcApi>;
					rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
					signedTransaction: SolSignedTransaction;
					commitment?: Commitment;
				}) => {
					assertTransactionIsFullySigned(signedTransaction);

					const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
						rpc,
						rpcSubscriptions
					});

					await sendAndConfirmTransaction(signedTransaction, { commitment });
				};

				// Explicitly do not await to proceed in the background and allow the UI to continue
				await sendSignedTransaction({
					rpc,
					rpcSubscriptions,
					signedTransaction
				});

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
