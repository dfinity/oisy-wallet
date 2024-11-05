import type { Erc20ContractAddress } from '$eth/types/erc20';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';

import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { JsonText } from '$icp/types/btc.post-message';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcCanisters, IcCkMetadata } from '$icp/types/ic-token';
import type { BtcAddress } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { SyncState } from '$lib/types/sync';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

export type PostMessageRequest =
	| 'startIdleTimer'
	| 'stopIdleTimer'
	| 'startCodeTimer'
	| 'stopCodeTimer'
	| 'startExchangeTimer'
	| 'stopExchangeTimer'
	| 'stopIcpWalletTimer'
	| 'startIcpWalletTimer'
	| 'triggerIcpWalletTimer'
	| 'stopIcrcWalletTimer'
	| 'startIcrcWalletTimer'
	| 'triggerIcrcWalletTimer'
	| 'stopBtcWalletTimer'
	| 'startBtcWalletTimer'
	| 'triggerBtcWalletTimer'
	| 'stopBtcStatusesTimer'
	| 'startBtcStatusesTimer'
	| 'triggerBtcStatusesTimer'
	| 'stopCkBTCUpdateBalanceTimer'
	| 'startCkBTCUpdateBalanceTimer'
	| 'stopCkMinterInfoTimer'
	| 'startCkMinterInfoTimer'
	| 'triggerCkMinterInfoTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export interface PostMessageDataRequestExchangeTimer {
	erc20Addresses: Erc20ContractAddress[];
	icrcCanisterIds: LedgerCanisterIdText[];
}

export type PostMessageDataRequestIcrc = IcCanisters & Pick<Network, 'env'>;

export type PostMessageDataRequestIcCk = Partial<Pick<IcCkMetadata, 'minterCanisterId'>>;

export type PostMessageDataRequestIcCkBTCUpdateBalance = PostMessageDataRequestIcCk & {
	btcAddress: string | undefined;
	bitcoinNetwork: BitcoinNetwork;
};

export interface PostMessageDataRequestBtc {
	btcAddress: CertifiedData<BtcAddress>;
	shouldFetchTransactions: boolean;
	bitcoinNetwork: SignerBitcoinNetwork;
}

export type PostMessageResponseStatus =
	| 'syncIcWalletStatus'
	| 'syncBtcWalletStatus'
	| 'syncBtcStatusesStatus'
	| 'syncCkMinterInfoStatus'
	| 'syncCkBTCUpdateBalanceStatus';

export type PostMessageResponse =
	| 'signOutIdleTimer'
	| 'delegationRemainingTime'
	| 'syncExchange'
	| 'syncExchangeError'
	| 'syncIcpWallet'
	| 'syncIcrcWallet'
	| 'syncBtcWallet'
	| 'syncIcpWalletError'
	| 'syncIcrcWalletError'
	| 'syncIcpWalletCleanUp'
	| 'syncIcrcWalletCleanUp'
	| 'syncBtcStatuses'
	| 'syncBtcStatusesError'
	| 'syncCkMinterInfo'
	| 'syncCkMinterInfoError'
	| 'syncBtcPendingUtxos'
	| 'syncCkBTCUpdateOk'
	| 'syncBtcAddress'
	| PostMessageResponseStatus;

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessageDataResponseExchange extends PostMessageDataResponse {
	currentEthPrice: CoingeckoSimplePriceResponse;
	currentBtcPrice: CoingeckoSimplePriceResponse;
	currentErc20Prices: CoingeckoSimpleTokenPriceResponse;
	currentIcpPrice: CoingeckoSimplePriceResponse;
	currentIcrcPrices: CoingeckoSimpleTokenPriceResponse;
}

export interface PostMessageDataResponseExchangeError extends PostMessageDataResponse {
	err: string | undefined;
}

// Transactions & {certified: boolean}
type JsonTransactionsText = string;

type PostMessageWalletData<T> = Omit<T, 'transactions' | 'balance'> & {
	balance: CertifiedData<bigint>;
	newTransactions: JsonTransactionsText;
};

export interface PostMessageDataResponseWallet<T = unknown> extends PostMessageDataResponse {
	wallet: PostMessageWalletData<T>;
}

export interface PostMessageDataResponseError extends PostMessageDataResponse {
	error: unknown;
}

export interface PostMessageDataResponseWalletCleanUp extends PostMessageDataResponse {
	transactionIds: string[];
}

export interface PostMessageJsonDataResponse extends PostMessageDataResponse {
	json: JsonText;
}

export interface PostMessageSyncState extends PostMessageDataResponse {
	state: SyncState;
}

export interface PostMessageDataResponseBTCAddress extends PostMessageDataResponse {
	address: BtcAddressData;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
