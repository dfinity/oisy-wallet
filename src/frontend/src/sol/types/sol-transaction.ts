import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionType } from '$lib/types/transaction';
import type { UnixTimestamp } from '@solana/web3.js';

export type SolTransactionType = Extract<
	TransactionType,
	(typeof solTransactionTypes.options)[number]
>;

export interface SolRpcTransaction {
	blockTime: UnixTimestamp | null;
	slot: bigint;
}

export type SolTransactionUi = SolRpcTransaction & { id: string };
