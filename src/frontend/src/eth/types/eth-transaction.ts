import type { EthAddress } from '$eth/types/address';
import type { ethTransactionTypes } from '$lib/schema/transaction.schema';
import type { Token } from '$lib/types/token';
import type { Transaction, TransactionId, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	(typeof ethTransactionTypes.options)[number]
>;

export interface EthTransactionUi extends Omit<Transaction, 'type'> {
	id: TransactionId;
	type: EthTransactionType;
	approveSpender?: EthAddress;
	transferRecipient?: EthAddress;
}

/**
 * An ERC fungible token transfer, together with the token it was loaded for.
 *
 * The transaction that performs a token transfer is addressed to the token contract, so it is listed
 * among the transactions of the native token that paid its fee as well. That native entry knows
 * nothing about the token - the hash is all that relates the two - hence this pairing.
 */
export interface ErcFungibleTransfer {
	transaction: Transaction;
	token: Token;
}
