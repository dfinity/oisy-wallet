import type { SolAddress } from '$sol/types/address';
import type {
	TransactionMessage,
	TransactionMessageWithBlockhashLifetime,
	TransactionMessageWithFeePayer,
	TransactionVersion
} from '@solana/kit';

export class SolAmountAssertionError extends Error {}

export type SolTransactionMessage = TransactionMessageWithBlockhashLifetime &
	TransactionMessageWithFeePayer<SolAddress> &
	Omit<Extract<TransactionMessage, { version: TransactionVersion }>, 'feePayer'>;
