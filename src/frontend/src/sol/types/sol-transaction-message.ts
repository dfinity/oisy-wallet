import type {
	BaseTransactionMessage,
	TransactionMessageWithFeePayer,
	TransactionMessageWithLifetime
} from '@solana/transaction-messages';

export type CompilableTransactionMessage = BaseTransactionMessage &
	TransactionMessageWithFeePayer &
	TransactionMessageWithLifetime;
