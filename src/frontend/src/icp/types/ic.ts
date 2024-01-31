import type { CanisterIdText } from '$lib/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type {
	IcrcTransaction as IcrcTransactionCandid,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import type { BigNumber } from '@ethersproject/bignumber';

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

export interface IcTransactionUi {
	id: bigint;
	type: IcTransactionType;
	// e.g. BTC Received
	description?: string;
	from?: string;
	to?: string;
	// e.g. To: BTC Network
	toLabel?: string;
	incoming?: boolean;
	value?: BigNumber;
	timestamp?: bigint;
}

export type IcToken = Token & IcFee & IcInterface;
export type IcTokenWithoutId = Omit<IcToken, 'id'>;

export type IcFee = { fee: bigint };

export type IcInterface = IcCanisters & IcExchangeCoin;
export type IcCanisters = {
	ledgerCanisterId: CanisterIdText;
	indexCanisterId: CanisterIdText;
};

export type IcCkInterface = IcInterface & IcCkCanisters;
export type IcCkCanisters = {
	minterCanisterId: CanisterIdText;
};

export type IcExchangeCoin = { exchangeCoinId: CoingeckoCoinsId };
