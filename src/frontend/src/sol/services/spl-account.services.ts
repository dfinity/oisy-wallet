import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { loadTokenAccount } from '$sol/api/solana.api';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SplTokenAddress } from '$sol/types/spl';
import { assertNonNullish } from '@dfinity/utils';
import { getCreateAssociatedTokenIdempotentInstructionAsync } from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';
import { pipe } from '@solana/functional';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
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
	appendTransactionMessageInstruction,
	createTransactionMessage,
	setTransactionMessageLifetimeUsingBlockhash
} from '@solana/transaction-messages';
import type { Transaction } from '@solana/transactions';
import { sendAndConfirmTransactionFactory } from '@solana/web3.js';

const createDefaultTransaction = async ({
	rpc,
	feePayer
}: {
	rpc: Rpc<SolanaRpcApi>;
	feePayer: TransactionSigner;
}) => {
	const { getLatestBlockhash } = rpc;
	const { value: latestBlockhash } = await getLatestBlockhash().send();
	return pipe(
		createTransactionMessage({ version: 'legacy' }),
		(tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
	);
};

// https://github.com/solana-program/token/blob/6d6a610571854beccadade5d437e8c4dcfb39f9e/clients/js/test/createAssociatedTokenIdempotent.test.ts#L15
const createCreateSplAccountMessage = async ({
	signer,
	destination,
	network,
	tokenAddress
}: {
	signer: TransactionSigner;
	destination: SolAddress;
	network: SolanaNetworkType;
	tokenAddress: SplTokenAddress;
}): Promise<SolTransactionMessage> => {
	const rpc = solanaHttpRpc(network);

	const createAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: signer,
		mint: solAddress(tokenAddress),
		owner: solAddress(destination)
	});

	return pipe(await createDefaultTransaction({ rpc, feePayer: signer }), (tx) =>
		appendTransactionMessageInstruction(createAta, tx)
	);
};

// TODO: check what are the fees for this method
// TODO: add a step in progress when fetching/creating token accounts
export const createSplTokenAccount = async ({
	identity,
	destination,
	source,
	network,
	tokenAddress
}: {
	identity: OptionIdentity;
	destination: SolAddress;
	source: SolAddress;
	network: SolanaNetworkType;
	tokenAddress: SolAddress;
}): Promise<SolAddress> => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const rpc = solanaHttpRpc(network);
	const rpcSubscriptions = solanaWebSocketRpc(network);

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

	const ataMessage = await createCreateSplAccountMessage({
		signer,
		destination,
		network,
		tokenAddress
	});

	const signedTransaction = await signTransactionMessageWithSigners(ataMessage);

	const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

	await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' });

	const newSplTokenAccount = await loadTokenAccount({
		address: destination,
		network,
		tokenAddress
	});

	// This should not happen since we just created the account. But we need it to return a non-nullish value
	assertNonNullish(
		newSplTokenAccount,
		`Token account not found for wallet ${destination} and token ${tokenAddress} on ${network} network`
	);

	return newSplTokenAccount;
};
