import type { kaspaTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { KaspaAddress } from '$kaspa/types/address';

export type KaspaTransactionType = Extract<
	TransactionType,
	(typeof kaspaTransactionTypes.options)[number]
>;

export type KaspaTransactionStatus = 'confirmed' | 'pending';

// Kaspa uses UTXO model like Bitcoin, so transactions can have multiple recipients
export interface KaspaTransactionUi extends Omit<TransactionUiCommon, 'to'> {
	id: TransactionId;
	type: KaspaTransactionType;
	status: KaspaTransactionStatus;
	value?: bigint;
	fee?: bigint;
	blueScore?: number;
	from: KaspaAddress;
	// Kaspa transaction can have multiple recipients
	to?: KaspaAddress[];
}
