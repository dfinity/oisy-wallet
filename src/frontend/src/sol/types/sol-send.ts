import type { SolAddress } from '$lib/types/address';
import type {
	ITransactionMessageWithFeePayer,
	TransactionMessage,
	TransactionMessageWithBlockhashLifetime,
	TransactionVersion
} from '@solana/transaction-messages';

export class SolAmountAssertionError extends Error {}

export type SolTransactionMessage = TransactionMessageWithBlockhashLifetime &
	ITransactionMessageWithFeePayer<SolAddress> &
	Omit<Extract<TransactionMessage, { version: TransactionVersion }>, 'feePayer'>;
