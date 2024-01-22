import type { CanisterIdText } from '$lib/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type {
	IcrcTransaction as IcrcTransactionCandid,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import type { BigNumber } from '@ethersproject/bignumber';

export interface IcTransactionToSelf {
	toSelf: boolean;
}

export type IcpTransaction = { transaction: Transaction & IcTransactionToSelf } & Pick<
	TransactionWithId,
	'id'
>;
export type IcrcTransaction = { transaction: IcrcTransactionCandid & IcTransactionToSelf } & Pick<
	IcrcTransactionWithId,
	'id'
>;

export type IcTransaction = IcpTransaction | IcrcTransaction;

export type IcTransactionType = 'approve' | 'burn' | 'mint' | 'send' | 'receive' | 'transfer-from';

export interface IcTransactionUi {
	id: bigint;
	type: IcTransactionType;
	from?: string;
	to?: string;
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
