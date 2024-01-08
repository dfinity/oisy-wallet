import type { CanisterIdText } from '$lib/types/canister';
import type { CoingeckoCoinsId } from '$lib/types/coingecko';
import type { Token } from '$lib/types/token';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import type { IcrcGetTransactions, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { BigNumber } from '@ethersproject/bignumber';
import type { IcpTransaction } from './icp';

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

export type IcToken = Token & IcFee & IcInterface;
export type IcFee = { fee: bigint };
export type IcInterface = IcCanisters & IcExchangeCoin;
export type IcCanisters = { ledgerCanisterId: CanisterIdText; indexCanisterId: CanisterIdText };
export type IcExchangeCoin = { exchangeCoinId: CoingeckoCoinsId };
