import type { IcpTransaction } from '$lib/types/icp';
import type { IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { BigNumber } from '@ethersproject/bignumber';

export type JsonTransactionsText = string;

export type Wallet<T> = Omit<T, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};

export type IcTransaction = IcpTransaction | IcrcTransactionWithId;

export interface IcTransactionUi {
	from?: string;
	to?: string;
	value?: BigNumber;
	timestamp?: bigint;
}
