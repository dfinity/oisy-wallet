import { icpTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
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

export type IcTransaction = IcpTransaction | IcrcTransaction;

export type IcTransactionType = Extract<
	TransactionType,
	(typeof icpTransactionTypes.options)[number]
>;

export type IcTransactionIdText = string;

export type IcTransactionStatus = 'executed' | 'pending' | 'reimbursed' | 'failed';

export type IcTransactionUi = TransactionUiCommon & {
	type: IcTransactionType;
	// e.g. BTC Received
	typeLabel?: string;
	// e.g. From: BTC Network
	fromLabel?: string;
	// e.g. To: BTC Network
	toLabel?: string;
	incoming?: boolean;
	value?: bigint;
	status: IcTransactionStatus;
};
