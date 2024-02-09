import type { Result_3 } from '$declarations/airdrop/airdrop.did';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { PostMessageWalletData } from '$icp/types/ic.post-message';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';

import type { JsonPendingUtxos, JsonStatusesText, JsonText } from '$icp/types/btc.post-message';
import type { IcCanisters, IcCkCanisters } from '$icp/types/ic';

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
	| 'stopCkBTCMinterInfoTimer'
	| 'startCkBTCMinterInfoTimer'
	| 'triggerCkBTCMinterInfoTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export interface PostMessageDataRequestExchangeTimer {
	erc20Addresses: Erc20ContractAddress[];
}

export type PostMessageDataRequestIcrc = IcCanisters;

// TODO: rename
export type PostMessageDataRequestCkBTCWallet = Partial<Pick<IcCkCanisters, 'minterCanisterId'>>;

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
	| 'syncCktcMinterInfo'
	| 'syncCktcMinterInfoError'
	| 'syncBtcPendingUtxos'
	| 'syncCkBtcUpdateOk';

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

// TODO: use PostMessageJsonDataResponseCkBTC
export interface PostMessageDataResponseBtcStatuses extends PostMessageDataResponse {
	statuses: JsonStatusesText;
}

// TODO: use PostMessageJsonDataResponseCkBTC
export interface PostMessageDataResponseBtcPendingUtxos extends PostMessageDataResponse {
	pendingUtxos: JsonPendingUtxos;
}

export interface PostMessageJsonDataResponseCkBTC extends PostMessageDataResponse {
	json: JsonText;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
