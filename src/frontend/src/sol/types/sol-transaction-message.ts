import type {
	TransactionMessage,
	TransactionMessageWithFeePayer,
	TransactionMessageWithLifetime
} from '@solana/transaction-messages';

export type CompilableTransactionMessage = TransactionMessage &
	TransactionMessageWithFeePayer &
	TransactionMessageWithLifetime;
