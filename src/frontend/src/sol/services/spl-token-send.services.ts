import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import { i18n } from '$lib/stores/i18n.store';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { solanaHttpRpc, solanaWebSocketRpc } from '$sol/providers/sol-rpc.providers';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { getTransferInstruction } from '@solana-program/token';
import { address as solAddress } from '@solana/addresses';
import { pipe } from '@solana/functional';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	signTransactionMessageWithSigners,
	type SignatureDictionary,
	type TransactionPartialSigner
} from '@solana/signers';
import {
	appendTransactionMessageInstructions,
	createTransactionMessage,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash
} from '@solana/transaction-messages';
import { getSignatureFromTransaction, type Transaction } from '@solana/transactions';
import { sendAndConfirmTransactionFactory } from '@solana/web3.js';
import { get } from 'svelte/store';

export const sendSplToken = async ({
	identity,
	token: {
		network: { id: networkId }
	},
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
}): Promise<void> => {
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

	const { getLatestBlockhash } = rpc;

	const { value: latestBlockhash } = await getLatestBlockhash().send();

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

	const transactionMessage = pipe(
		createTransactionMessage({ version: 'legacy' }),
		(tx) => setTransactionMessageFeePayer(signer.address, tx),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
		(tx) =>
			appendTransactionMessageInstructions(
				[
					getTransferInstruction({
						source: solAddress(source),
						destination: solAddress(destination),
						authority: solAddress(source),
						amount: BigInt(amount.toNumber())
					})
				],
				tx
			)
	);

	onProgress?.();

	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

	try {
		// TODO: do not await transaction to be completed
		await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' });
		const signature = getSignatureFromTransaction(signedTransaction);
		console.log('✅ - Transfer transaction:', signature);
		onProgress?.();
	} catch (e) {
		console.error('Transfer failed:', e);
	}
};
