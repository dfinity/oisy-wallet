import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import {
	IcCanistersSchema,
	IcCanistersStrictSchema,
	IcCkMetadataSchema
} from '$icp/schema/ic-token.schema';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { JsonText } from '$icp/types/btc.post-message';
import { CurrencyExchangeDataSchema, CurrencySchema } from '$lib/schema/currency.schema';
import { NetworkSchema } from '$lib/schema/network.schema';
import { SyncStateSchema } from '$lib/schema/sync.schema';
import type { BtcAddress, SolAddress } from '$lib/types/address';
import { CanisterIdTextSchema, type OptionCanisterIdText } from '$lib/types/canister';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CertifiedData } from '$lib/types/store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import * as z from 'zod/v4';

export const POST_MESSAGE_REQUESTS = [
	'startIdleTimer',
	'stopIdleTimer',
	'startCodeTimer',
	'stopCodeTimer',
	'startExchangeTimer',
	'stopExchangeTimer',
	'startPowProtectionTimer',
	'triggerPowProtectionTimer',
	'stopPowProtectionTimer',
	'stopIcpWalletTimer',
	'startIcpWalletTimer',
	'triggerIcpWalletTimer',
	'stopIcrcWalletTimer',
	'startIcrcWalletTimer',
	'triggerIcrcWalletTimer',
	'stopDip20WalletTimer',
	'startDip20WalletTimer',
	'triggerDip20WalletTimer',
	'stopBtcWalletTimer',
	'stopSolWalletTimer',
	'startBtcWalletTimer',
	'startSolWalletTimer',
	'triggerBtcWalletTimer',
	'triggerSolWalletTimer',
	'stopBtcStatusesTimer',
	'startBtcStatusesTimer',
	'triggerBtcStatusesTimer',
	'stopCkBTCUpdateBalanceTimer',
	'startCkBTCUpdateBalanceTimer',
	'stopCkEthMinterInfoTimer',
	'startCkEthMinterInfoTimer',
	'triggerCkEthMinterInfoTimer',
	'stopCkBtcMinterInfoTimer',
	'startCkBtcMinterInfoTimer',
	'triggerCkBtcMinterInfoTimer'
] as const;

export const PostMessageRequestSchema = z.enum(POST_MESSAGE_REQUESTS);

export const PostMessageDataRequestSchema = z.never();
export const PostMessageDataResponseSchema = z.strictObject({});
export const PostMessageDataResponseLooseSchema = z.looseObject({});

export const PostMessageDataRequestExchangeTimerSchema = z.object({
	currentCurrency: CurrencySchema,
	// TODO: generate zod schema for Erc20ContractAddressWithNetwork
	erc20Addresses: z.array(z.custom<Erc20ContractAddressWithNetwork>()),
	icrcCanisterIds: z.array(CanisterIdTextSchema),
	splAddresses: z.array(z.custom<SplTokenAddress>())
});

export const PostMessageDataRequestIcrcSchema = z.object({
	...IcCanistersSchema.shape,
	...NetworkSchema.pick({ env: true }).shape
});

export const PostMessageDataRequestIcrcStrictSchema = z.object({
	...IcCanistersStrictSchema.shape,
	...NetworkSchema.pick({ env: true }).shape
});

export const PostMessageDataRequestDip20Schema = z.object({
	canisterId: CanisterIdTextSchema
});

export const PostMessageDataRequestIcpSchema = z.object({
	indexCanisterId: CanisterIdTextSchema
});

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

export const PostMessageDataRequestSolSchema = z.object({
	// TODO: generate zod schema for CertifiedData
	address: z.custom<CertifiedData<SolAddress>>(),
	solanaNetwork: z.custom<SolanaNetworkType>(),
	tokenAddress: z.custom<SplTokenAddress>().optional(),
	tokenOwnerAddress: z.custom<SolAddress>().optional()
});

export const PostMessageResponseStatusSchema = z.enum([
	'syncIcWalletStatus',
	'syncBtcWalletStatus',
	'syncSolWalletStatus',
	'syncBtcStatusesStatus',
	'syncCkMinterInfoStatus',
	'syncCkBTCUpdateBalanceStatus',
	'syncPowProtectionStatus'
]);

export const PostMessageErrorResponseSchema = z.enum([
	'syncExchangeError',
	'syncIcpWalletError',
	'syncIcrcWalletError',
	'syncDip20WalletError',
	'syncBtcWalletError',
	'syncSolWalletError',
	'syncBtcStatusesError',
	'syncCkMinterInfoError',
	'syncPowProtectionError'
]);

export const PostMessageResponseSchema = z.enum([
	'signOutIdleTimer',
	'delegationRemainingTime',
	'syncExchange',
	'syncIcpWallet',
	'syncIcrcWallet',
	'syncDip20Wallet',
	'syncBtcWallet',
	'syncSolWallet',
	'syncIcpWalletCleanUp',
	'syncIcrcWalletCleanUp',
	'syncDip20WalletCleanUp',
	'syncBtcStatuses',
	'syncCkMinterInfo',
	'syncBtcPendingUtxos',
	'syncCkBTCUpdateOk',
	'syncBtcAddress',
	'syncPowProgress',
	'syncPowNextAllowance',
	...PostMessageResponseStatusSchema.options
]);

export const PostMessageDataResponseAuthSchema = PostMessageDataResponseSchema.extend({
	authRemainingTime: z.number()
});

// TODO: generate zod schema for Coingecko
export const PostMessageDataResponseExchangeSchema = PostMessageDataResponseSchema.extend({
	currentExchangeRate: CurrencyExchangeDataSchema.optional(),
	currentEthPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentBtcPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentErc20Prices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentIcpPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentIcrcPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentSolPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentSplPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentBnbPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentPolPrice: z.custom<CoingeckoSimplePriceResponse>()
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

export const PostMessageDataErrorSchema = z.object({
	msg: PostMessageErrorResponseSchema,
	data: PostMessageDataResponseErrorSchema
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

export const PostMessageDataResponsePowProtectorProgressSchema =
	PostMessageDataResponseSchema.extend({
		progress: z.enum(['REQUEST_CHALLENGE', 'SOLVE_CHALLENGE', 'GRANT_CYCLES'])
	});

export const PostMessageDataResponsePowProtectorNextAllowanceSchema =
	PostMessageDataResponseSchema.extend({
		nextAllowanceMs: z.custom<bigint>().optional()
	});

export const inferPostMessageSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.union([
		z.object({
			msg: z.union([PostMessageRequestSchema, PostMessageResponseSchema]),
			data: z.strictObject(dataSchema).shape.optional()
		}),
		PostMessageDataErrorSchema
	]);
