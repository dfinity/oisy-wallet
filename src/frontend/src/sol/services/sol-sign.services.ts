import type { SolTransactionMessage } from '$sol/types/sol-send';
import type { SolSignedTransaction } from '$sol/types/sol-transaction';
import type { Signature } from '@solana/keys';
import { signTransactionMessageWithSigners } from '@solana/signers';
import { getSignatureFromTransaction } from '@solana/transactions';

export const signTransaction = async (
	transactionMessage: SolTransactionMessage
): Promise<{ signedTransaction: SolSignedTransaction; signature: Signature }> => {
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

	const signature = getSignatureFromTransaction(signedTransaction);

	return { signedTransaction, signature };
};
