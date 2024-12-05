import type { Erc20ContractAddress } from '$eth/types/erc20';
import {
	IcCanistersSchema,
	IcCanistersStrictSchema,
	IcCkMetadataSchema
} from '$icp/schema/ic-token.schema';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { JsonText } from '$icp/types/btc.post-message';
import { NetworkSchema } from '$lib/schema/network.schema';
import { SyncStateSchema } from '$lib/schema/sync.schema';
import type { BtcAddress } from '$lib/types/address';
import { CanisterIdTextSchema, type OptionCanisterIdText } from '$lib/types/canister';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CertifiedData } from '$lib/types/store';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { z } from 'zod';

export const PostMessageRequestSchema = z.enum([
	'startIdleTimer',
	'stopIdleTimer',
	'startCodeTimer',
	'stopCodeTimer',
	'startExchangeTimer',
	'stopExchangeTimer',
	'stopIcpWalletTimer',
	'startIcpWalletTimer',
	'triggerIcpWalletTimer',
	'stopIcrcWalletTimer',
	'startIcrcWalletTimer',
	'triggerIcrcWalletTimer',
	'stopBtcWalletTimer',
	'startBtcWalletTimer',
	'triggerBtcWalletTimer',
	'stopBtcStatusesTimer',
	'startBtcStatusesTimer',
	'triggerBtcStatusesTimer',
	'stopCkBTCUpdateBalanceTimer',
	'startCkBTCUpdateBalanceTimer',
	'stopCkMinterInfoTimer',
	'startCkMinterInfoTimer',
	'triggerCkMinterInfoTimer'
]);

export const PostMessageDataRequestSchema = z.never();
export const PostMessageDataResponseSchema = z.object({}).strict();

export const PostMessageDataRequestExchangeTimerSchema = z.object({
	// TODO: generate zod schema for Erc20ContractAddress
	erc20Addresses: z.array(z.custom<Erc20ContractAddress>()),
	icrcCanisterIds: z.array(CanisterIdTextSchema)
});

export const PostMessageDataRequestIcrcSchema = IcCanistersSchema.merge(
	NetworkSchema.pick({ env: true })
);

export const PostMessageDataRequestIcrcStrictSchema = IcCanistersStrictSchema.merge(
	NetworkSchema.pick({ env: true })
);

export const PostMessageDataRequestIcCkSchema = IcCkMetadataSchema.pick({
	minterCanisterId: true
}).partial();

export const PostMessageDataRequestIcCkBTCUpdateBalanceSchema =
	PostMessageDataRequestIcCkSchema.extend({
		btcAddress: z.string().optional(),
		// TODO: generate zod schema for BitcoinNetwork
		bitcoinNetwork: z.custom<BitcoinNetwork>()
	});

export const PostMessageDataRequestBtcSchema = z.object({
	// TODO: generate zod schema for CertifiedData
	btcAddress: z.custom<CertifiedData<BtcAddress>>(),
	shouldFetchTransactions: z.boolean(),
	// TODO: can we implement a generic way to convert Candid types to Zod?
	bitcoinNetwork: z.custom<BitcoinNetwork>(),
	minterCanisterId: z.custom<OptionCanisterIdText>().optional()
});

export const PostMessageResponseStatusSchema = z.enum([
	'syncIcWalletStatus',
	'syncBtcWalletStatus',
	'syncBtcStatusesStatus',
	'syncCkMinterInfoStatus',
	'syncCkBTCUpdateBalanceStatus'
]);

export const PostMessageResponseSchema = z.enum([
	'signOutIdleTimer',
	'delegationRemainingTime',
	'syncExchange',
	'syncExchangeError',
	'syncIcpWallet',
	'syncIcrcWallet',
	'syncBtcWallet',
	'syncIcpWalletError',
	'syncIcrcWalletError',
	'syncBtcWalletError',
	'syncIcpWalletCleanUp',
	'syncIcrcWalletCleanUp',
	'syncBtcStatuses',
	'syncBtcStatusesError',
	'syncCkMinterInfo',
	'syncCkMinterInfoError',
	'syncBtcPendingUtxos',
	'syncCkBTCUpdateOk',
	'syncBtcAddress',
	...PostMessageResponseStatusSchema.options
]);

export const PostMessageDataResponseAuthSchema = PostMessageDataResponseSchema.extend({
	authRemainingTime: z.number()
});

// TODO: generate zod schema for Coingecko
export const PostMessageDataResponseExchangeSchema = PostMessageDataResponseSchema.extend({
	currentEthPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentBtcPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentErc20Prices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentIcpPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentIcrcPrices: z.custom<CoingeckoSimpleTokenPriceResponse>()
});

export const PostMessageDataResponseExchangeErrorSchema = PostMessageDataResponseSchema.extend({
	err: z.string().optional()
});

// Transactions & {certified: boolean}
export const JsonTransactionsTextSchema = z.string();

export const PostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<bigint>>(),
	newTransactions: JsonTransactionsTextSchema.optional()
});

export const PostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: PostMessageWalletDataSchema
});

export const PostMessageDataResponseErrorSchema = PostMessageDataResponseSchema.extend({
	error: z.unknown()
});

export const PostMessageDataResponseWalletCleanUpSchema = PostMessageDataResponseSchema.extend({
	transactionIds: z.array(z.string())
});

export const PostMessageJsonDataResponseSchema = PostMessageDataResponseSchema.extend({
	json: z.custom<JsonText>()
});

export const PostMessageSyncStateSchema = PostMessageDataResponseSchema.extend({
	state: SyncStateSchema
});

export const PostMessageDataResponseBTCAddressSchema = PostMessageDataResponseSchema.extend({
	// TODO: generate zod schema for BtcAddressData
	address: z.custom<BtcAddressData>()
}).strict();

export const inferPostMessageSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		msg: z.union([PostMessageRequestSchema, PostMessageResponseSchema]),
		data: dataSchema.optional()
	});
