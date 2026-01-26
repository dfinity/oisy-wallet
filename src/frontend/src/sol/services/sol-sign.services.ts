import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import {
	assertIsTransactionWithBlockhashLifetime,
	getSignatureFromTransaction,
	signTransactionMessageWithSigners,
	type Signature
} from '@solana/kit';

export const signTransaction = async (
	transactionMessage: SolTransactionMessage
): Promise<{ signedTransaction: SolSignedTransaction; signature: Signature }> => {
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	// This is purely for type safety reasons: the `transactionMessage` input is already passed with a blockhash lifetime
	assertIsTransactionWithBlockhashLifetime(signedTransaction);

	const signature = getSignatureFromTransaction(signedTransaction);

	return { signedTransaction, signature };
};
