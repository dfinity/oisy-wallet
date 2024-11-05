import {
	IcAppMetadataSchema,
	IcCanistersSchema,
	IcCkInterfaceSchema,
	IcCkLinkedAssetsSchema,
	IcCkMetadataSchema,
	IcCkTokenSchema,
	IcFeeSchema,
	IcInterfaceSchema,
	IcTokenSchema,
	IcTokenWithoutIdSchema
} from '$icp/validation/ic-token.validation';
import type { TransactionType } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type {
	IcrcTransaction as IcrcTransactionCandid,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { z } from 'zod';

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

export type IcTransactionType = TransactionType | 'approve' | 'burn' | 'mint';

export type IcTransactionIdText = string;

export type IcTransactionStatus = 'executed' | 'pending' | 'reimbursed' | 'failed';

export interface IcTransactionUi {
	id: bigint | string;
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

export type IcFee = z.infer<typeof IcFeeSchema>;

export type IcAppMetadata = z.infer<typeof IcAppMetadataSchema>;

export type IcCanisters = z.infer<typeof IcCanistersSchema>;

export type IcCkLinkedAssets = z.infer<typeof IcCkLinkedAssetsSchema>;

export type IcCkMetadata = z.infer<typeof IcCkMetadataSchema>;

export type IcInterface = z.infer<typeof IcInterfaceSchema>;

export type IcToken = z.infer<typeof IcTokenSchema>;

export type IcTokenWithoutId = z.infer<typeof IcTokenWithoutIdSchema>;

export type IcCkToken = z.infer<typeof IcCkTokenSchema>;

export type IcCkInterface = z.infer<typeof IcCkInterfaceSchema>;

export type OptionIcToken = Option<IcToken>;
export type OptionIcCkToken = Option<IcCkToken>;
