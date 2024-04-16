import type {
	IndexCanisterIdText,
	LedgerCanisterIdText,
	MinterCanisterIdText
} from '$icp/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
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

export type IcTransactionType = 'approve' | 'burn' | 'mint' | 'send' | 'receive';

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

export type IcFee = { fee: bigint };

export type IcInterface = IcCanisters & IcAppMetadata;
export type IcCanisters = {
	ledgerCanisterId: LedgerCanisterIdText;
	indexCanisterId: IndexCanisterIdText;
};

export type IcCkToken = IcToken & Partial<IcCkMetadata>;

export type IcCkInterface = IcInterface & IcCkMetadata;

export type IcCkMetadata = {
	minterCanisterId: MinterCanisterIdText;
} & Partial<IcCkTwinToken>;

export type IcCkTwinToken = {
	twinToken: Token;
};

export type IcAppMetadata = {
	exchangeCoinId?: CoingeckoCoinsId;
	position: number;
};
