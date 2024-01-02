import type { IcpTransaction } from '$lib/types/icp';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import type { IcrcGetTransactions, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { BigNumber } from '@ethersproject/bignumber';

export type JsonTransactionsText = string;

export type Wallet<T> = Omit<T, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};

export type IcTransaction = IcpTransaction | IcrcTransactionWithId;
export type IcGetTransactions = GetAccountIdentifierTransactionsResponse | IcrcGetTransactions;

export type IcTransactionType = 'approve' | 'burn' | 'mint' | 'transfer' | 'transfer-from';

export interface IcTransactionUi {
	id: bigint;
	type: IcTransactionType;
	from?: string;
	to?: string;
	incoming?: boolean;
	value?: BigNumber;
	timestamp?: bigint;
}
