import type { BtcAddress } from '$btc/types/address';
import type { Erc4626TokensExchangeData } from '$eth/types/erc4626';
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
import { CanisterIdTextSchema, type OptionCanisterIdText } from '$lib/types/canister';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CertifiedData } from '$lib/types/store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import * as z from 'zod';

export const POST_MESSAGE_REQUESTS = [
	'startIdleTimer',
	'stopIdleTimer',
	'startExchangeTimer',
	'stopExchangeTimer',
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
	'stopXrpWalletTimer',
	'startXrpWalletTimer',
	'triggerXrpWalletTimer',
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
	splAddresses: z.array(z.custom<SplTokenAddress>()),
	erc4626TokensExchangeData: z.array(z.custom<Erc4626TokensExchangeData>()),
	// Effective backend `exchange_rate_enabled` flag, resolved at runtime via the backend
	// `exchange_rate_enabled` query. Optional for backwards compatibility — when absent,
	// the worker falls back to the build-time `BACKEND_EXCHANGE_ENABLED` env constant.
	backendExchangeEnabled: z.boolean().optional()
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
	ledgerCanisterId: CanisterIdTextSchema,
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

export const PostMessageDataRequestXrpSchema = z.object({
	// TODO: generate zod schema for CertifiedData
	address: z.custom<CertifiedData<XrpAddress>>(),
	xrpNetwork: z.custom<XrpNetworkType>()
});

export const PostMessageResponseStatusSchema = z.enum([
	'syncIcWalletStatus',
	'syncBtcWalletStatus',
	'syncSolWalletStatus',
	'syncXrpWalletStatus',
	'syncBtcStatusesStatus',
	'syncCkMinterInfoStatus',
	'syncCkBTCUpdateBalanceStatus'
]);

export const PostMessageErrorResponseSchema = z.enum([
	'syncExchangeError',
	'syncIcpWalletError',
	'syncIcrcWalletError',
	'syncDip20WalletError',
	'syncBtcWalletError',
	'syncSolWalletError',
	'syncXrpWalletError',
	'syncBtcStatusesError',
	'syncCkMinterInfoError'
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
	'syncXrpWallet',
	'syncIcpWalletCleanUp',
	'syncIcrcWalletCleanUp',
	'syncDip20WalletCleanUp',
	'syncBtcStatuses',
	'syncCkMinterInfo',
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
	currentExchangeRate: CurrencyExchangeDataSchema.optional(),
	currentEthPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentBtcPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentErc20Prices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentIcpPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentIcrcPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentSolPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentSplPrices: z.custom<CoingeckoSimpleTokenPriceResponse>().optional(),
	currentErc4626Prices: z.custom<CoingeckoSimpleTokenPriceResponse>().optional(),
	currentBnbPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentPolPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentArbitrumEthPrice: z.custom<CoingeckoSimplePriceResponse>().optional(),
	currentBaseEthPrice: z.custom<CoingeckoSimplePriceResponse>().optional()
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
	error: z.unknown().optional()
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

export const PostMessageCommonSchema = z.object({
	ref: z.string()
});

const buildPostMessageResponseSchema = <T extends z.ZodTypeAny>({
	dataSchema
}: {
	dataSchema: T;
}) =>
	z.union([
		z
			.object({
				...PostMessageCommonSchema.shape,
				msg: PostMessageResponseSchema,
				data: dataSchema.optional()
			})
			.strict(),
		z
			.object({
				...PostMessageCommonSchema.shape,
				...PostMessageDataErrorSchema.shape
			})
			.strict()
	]);

export const inferPostMessageSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.union([
		z
			.object({
				msg: PostMessageRequestSchema,
				data: dataSchema.optional()
			})
			.strict(),
		buildPostMessageResponseSchema({ dataSchema })
	]);

export const inferPostMessageSchedulerSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	buildPostMessageResponseSchema({ dataSchema });
