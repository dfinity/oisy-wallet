import type { Result_3 } from '$declarations/airdrop/airdrop.did';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { PostMessageWalletData } from '$icp/types/ic.post-message';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';

import type { JsonText } from '$icp/types/btc.post-message';
import type { IcCanisters, IcCkMetadata } from '$icp/types/ic';
import type { SyncState } from '$lib/types/sync';

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
	| 'stopCkBTCWalletTimer'
	| 'startCkBTCWalletTimer'
	| 'triggerCkBTCWalletTimer'
	| 'stopCkMinterInfoTimer'
	| 'startCkMinterInfoTimer'
	| 'triggerCkMinterInfoTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export interface PostMessageDataRequestExchangeTimer {
	erc20Addresses: Erc20ContractAddress[];
}

export type PostMessageDataRequestIcrc = IcCanisters;

export type PostMessageDataRequestIcCk = Partial<Pick<IcCkMetadata, 'minterCanisterId'>>;

export type PostMessageResponseStatus =
	| 'syncWalletStatus'
	| 'syncBtcStatusesStatus'
	| 'syncCkMinterInfoStatus'
	| 'syncCkBTCUpdateBalanceStatus';

export type PostMessageResponse =
	| 'signOutIdleTimer'
	| 'delegationRemainingTime'
	| 'syncAirdropCode'
	| 'syncExchange'
	| 'syncExchangeError'
	| 'syncIcpWallet'
	| 'syncIcrcWallet'
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
	| PostMessageResponseStatus;

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessageDataResponseAirdropCode extends PostMessageDataResponse {
	airdrop: Result_3;
}

export interface PostMessageDataResponseExchange extends PostMessageDataResponse {
	currentEthPrice: CoingeckoSimplePriceResponse;
	currentBtcPrice: CoingeckoSimplePriceResponse;
	currentErc20Prices: CoingeckoSimplePriceResponse;
	currentIcpPrice: CoingeckoSimplePriceResponse;
}

export interface PostMessageDataResponseExchangeError extends PostMessageDataResponse {
	err: string | undefined;
}

export interface PostMessageDataResponseWallet<T> extends PostMessageDataResponse {
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

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
