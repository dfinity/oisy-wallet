import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { Commitment } from '@solana/rpc-types';

export type SolTransactionType = Extract<
	TransactionType,
	(typeof solTransactionTypes.options)[number]
>;

export interface SolTransactionUi extends TransactionUiCommon {
	id: string;
	type: SolTransactionType;
	status: Commitment | null;
	value?: bigint;
	fee?: bigint;
}