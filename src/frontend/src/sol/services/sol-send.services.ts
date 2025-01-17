import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import { i18n } from '$lib/stores/i18n.store';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { loadTokenAccount } from '$sol/api/solana.api';
import { SOLANA_DERIVATION_PATH_PREFIX, TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { getTransferSolInstruction } from '@solana-program/system';
import { getTransferInstruction } from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';
import { pipe } from '@solana/functional';
import type { Signature } from '@solana/keys';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import { lamports, type Commitment } from '@solana/rpc-types';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	setTransactionMessageFeePayerSigner,
	signTransactionMessageWithSigners,
	type SignatureDictionary,
	type TransactionPartialSigner,
	type TransactionSigner
} from '@solana/signers';
import {
	appendTransactionMessageInstructions,
	createTransactionMessage,
	setTransactionMessageLifetimeUsingBlockhash,
	type TransactionMessage,
	type TransactionVersion
} from '@solana/transaction-messages';
import {
	assertTransactionIsFullySigned,
	getSignatureFromTransaction,
	type Transaction
} from '@solana/transactions';
import { sendAndConfirmTransactionFactory } from '@solana/web3.js';
import { get } from 'svelte/store';

const setLifetimeAndFeePayerToTransaction = async ({
	transactionMessage,
	rpc,
	feePayer
}: {
	transactionMessage: TransactionMessage;
	rpc: Rpc<SolanaRpcApi>;
	feePayer: TransactionSigner;
}): Promise<SolTransactionMessage> => {
	const { getLatestBlockhash } = rpc;
	const { value: latestBlockhash } = await getLatestBlockhash().send();

	return pipe(
		transactionMessage,
		(tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
	);
};

const createDefaultTransaction = async ({
	rpc,
	feePayer,
	version = 'legacy'
}: {
	rpc: Rpc<SolanaRpcApi>;
	feePayer: TransactionSigner;
	version?: TransactionVersion;
}): Promise<SolTransactionMessage> =>
	await pipe(
		createTransactionMessage({ version }),
		async (tx) =>
			await setLifetimeAndFeePayerToTransaction({ transactionMessage: tx, rpc, feePayer })
	);

const createSolTransactionMessage = async ({
	signer,
	destination,
	amount,
	network
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	amount: BigNumber;
	network: SolanaNetworkType;
}): Promise<SolTransactionMessage> => {
	const rpc = solanaHttpRpc(network);

	return pipe(await createDefaultTransaction({ rpc, feePayer: signer }), (tx) =>
		appendTransactionMessageInstructions(
			[
				getTransferSolInstruction({
					source: signer,
					destination: solAddress(destination),
					amount: lamports(amount.toBigInt())
				})
			],
			tx
		)
	);
};

const createSplTokenTransactionMessage = async ({
	signer,
	destination,
	amount,
	network,
	tokenAddress
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	amount: BigNumber;
	network: SolanaNetworkType;
	tokenAddress: SolAddress;
}): Promise<SolTransactionMessage> => {
	const rpc = solanaHttpRpc(network);

	const source = signer.address;

	const sourceTokenAccountAddress = await loadTokenAccount({
		address: source,
		network,
		tokenAddress
	});

	const destinationTokenAccountAddress = await loadTokenAccount({
		address: destination,
		network,
		tokenAddress
	});

	return pipe(await createDefaultTransaction({ rpc, feePayer: signer }), (tx) =>
		appendTransactionMessageInstructions(
			[
				getTransferInstruction(
					{
						source: solAddress(sourceTokenAccountAddress),
						destination: solAddress(destinationTokenAccountAddress),
						authority: signer,
						amount: amount.toBigInt()
					},
					{ programAddress: solAddress(TOKEN_PROGRAM_ADDRESS) }
				)
			],
			tx
		)
	);
};

export const signTransaction = async ({
	transactionMessage
}: {
	transactionMessage: SolTransactionMessage;
}): Promise<{ signedTransaction: SolSignedTransaction; signature: Signature }> => {
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	const signature = getSignatureFromTransaction(signedTransaction);

	return { signedTransaction, signature };
};

const sendSignedTransaction = ({
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

	const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

	sendAndConfirmTransaction(signedTransaction, { commitment });
};

/**
 * Send SOL or SPL tokens from one address to another.
 *
 * This function will sign the transaction with the provided identity and send it to the network.
 * It is based on the Solana web3.js library.
 * https://solana.com/developers/cookbook/transactions/send-sol
 */
export const sendSol = async ({
	identity,
	token,
	amount,
	destination,
	source,
	onProgress
}: {
	identity: OptionIdentity;
	token: Token;
	amount: BigNumber;
	destination: SolAddress;
	source: SolAddress;
	onProgress?: () => void;
}): Promise<Signature> => {
	const {
		network: { id: networkId }
	} = token;

	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, solNetwork];

	const rpc = solanaHttpRpc(solNetwork);
	const rpcSubscriptions = solanaWebSocketRpc(solNetwork);

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

	const transactionMessage = isTokenSpl(token)
		? await createSplTokenTransactionMessage({
				signer,
				destination,
				amount,
				network: solNetwork,
				tokenAddress: token.address
			})
		: await createSolTransactionMessage({
				signer,
				destination,
				amount,
				network: solNetwork
			});

	onProgress?.();

	const { signedTransaction, signature } = await signTransaction({ transactionMessage });

	// Explicitly do not await to proceed in the background and allow the UI to continue
	sendSignedTransaction({
		rpc,
		rpcSubscriptions,
		signedTransaction
	});

	onProgress?.();

	return signature;
};
