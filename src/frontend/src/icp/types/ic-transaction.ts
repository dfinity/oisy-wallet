import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type { icpTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionId, TransactionType } from '$lib/types/transaction';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type {
	IcrcTransaction as IcrcTransactionCandid,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';

export interface IcTransactionAddOnsInfo {
	transferToSelf?: 'send' | 'receive';
}

export type IcpTransaction = { transaction: Transaction & IcTransactionAddOnsInfo } & Pick<
	TransactionWithId,
	'id'
>;
export type IcrcTransaction = {
	transaction: IcrcTransactionCandid & IcTransactionAddOnsInfo;
} & Pick<IcrcTransactionWithId, 'id'>;
export type Dip20Transaction = { transaction: Event & IcTransactionAddOnsInfo } & Pick<
	Dip20TransactionWithId,
	'id'
>;

export type IcTransaction = IcpTransaction | IcrcTransaction;

export type IcTransactionType = Extract<
	TransactionType,
	(typeof icpTransactionTypes.options)[number]
>;

export type IcTransactionIdText = string;

export type IcTransactionStatus = 'executed' | 'pending' | 'reimbursed' | 'failed';

export interface IcTransactionUi {
	id: TransactionId;
	type: IcTransactionType;
	// e.g. BTC Received
	typeLabel?: string;
	from?: string;
	// e.g. From: BTC Network
	fromLabel?: string;
	fromExplorerUrl?: string;
	to?: string;
	// e.g. To: BTC Network
	toLabel?: string;
	toExplorerUrl?: string;
	incoming?: boolean;
	value?: bigint;
	timestamp?: bigint;
	status: IcTransactionStatus;
	txExplorerUrl?: string;
}
