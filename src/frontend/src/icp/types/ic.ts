import type {
	IndexCanisterIdText,
	LedgerCanisterIdText,
	MinterCanisterIdText
} from '$icp/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
import type { TransactionType } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
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

export type IcToken = Token & IcFee & IcInterface;
export type IcTokenWithoutId = Omit<IcToken, 'id'>;

export interface IcFee {
	fee: bigint;
}

export type IcInterface = IcCanisters & IcAppMetadata;
export interface IcCanisters {
	ledgerCanisterId: LedgerCanisterIdText;
	indexCanisterId: IndexCanisterIdText;
}

export type IcCkToken = IcToken & Partial<IcCkMetadata>;

export type IcCkInterface = IcInterface & IcCkMetadata;

export type IcCkMetadata = {
	minterCanisterId: MinterCanisterIdText;
} & Partial<IcCkLinkedAssets>;

export interface IcCkLinkedAssets {
	twinToken: Token;
	feeLedgerCanisterId?: LedgerCanisterIdText;
}

export interface IcAppMetadata {
	exchangeCoinId?: CoingeckoCoinsId;
	position: number;
	explorerUrl?: string;
}

export type OptionIcToken = Option<IcToken>;
export type OptionIcCkToken = Option<IcCkToken>;
