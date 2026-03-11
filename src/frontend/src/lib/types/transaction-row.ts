import type { Token } from '$lib/types/token';
import type { TransactionStatus, TransactionType } from '$lib/types/transaction';

export interface TransactionRowUi {
	displayAmount: bigint;
	type: TransactionType;
	status: TransactionStatus;
	timestamp?: number;
	to?: string;
	from?: string;
	tokenId?: number;
	approveSpender?: string;
	token: Token;
}
