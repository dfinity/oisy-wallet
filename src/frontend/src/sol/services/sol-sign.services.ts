import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import {
	getSignatureFromTransaction,
	signTransactionMessageWithSigners,
	type Signature
} from '@solana/web3.js';

export const signTransaction = async (
	transactionMessage: SolTransactionMessage
): Promise<{ signedTransaction: SolSignedTransaction; signature: Signature }> => {
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	const signature = getSignatureFromTransaction(signedTransaction);

	return { signedTransaction, signature };
};
