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
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import {
	setLifetimeAndFeePayerToTransaction,
	signTransaction
} from '$sol/services/sol-send.services';
import { createSigner } from '$sol/services/sol-sign.services';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	decodeTransactionMessage,
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage,
	transactionMessageHasBlockhashLifetime
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
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

				const { signatures } = decodeTransactionMessage(base64EncodedTransactionMessage);
				const additionalAddresses = Object.keys(signatures).filter((address) => address !== source);

				const signer = createSigner({
					identity,
					address: source,
					network: solNetwork,
					additionalAddresses
				});

				const transactionMessageRaw = await parseSolBase64TransactionMessage({
					transactionMessage: base64EncodedTransactionMessage,
					rpc
				});

				// It should not happen, since we receive transaction with blockhash lifetime, but just to guarantee the correct casting
				if (!transactionMessageHasBlockhashLifetime(transactionMessageRaw)) {
					// throw new Error('Blockhash not found in transaction message lifetime constraint');
					return { success: false };
				}

				const transactionMessage = await setLifetimeAndFeePayerToTransaction({
					transactionMessage: transactionMessageRaw,
					rpc,
					feePayer: signer
				});

				progress(ProgressStepsSign.SIGN);

				console.log('transactionMessage', transactionMessage);

				const { signature } = await signTransaction({ transactionMessage });

				console.log('signature', signature);

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
