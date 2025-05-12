import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import {
	IcCanistersSchema,
	IcCanistersStrictSchema,
	IcCkMetadataSchema
} from '$icp/schema/ic-token.schema';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { JsonText } from '$icp/types/btc.post-message';
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
import * as z from 'zod';

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
export const PostMessageDataResponseSchema = z.object({}).strict();

export const PostMessageDataRequestExchangeTimerSchema = z.object({
	// TODO: generate zod schema for Erc20ContractAddressWithNetwork
	erc20Addresses: z.array(z.custom<Erc20ContractAddressWithNetwork>()),
	icrcCanisterIds: z.array(CanisterIdTextSchema),
	splAddresses: z.array(z.custom<SplTokenAddress>())
});

export const PostMessageDataRequestIcrcSchema = IcCanistersSchema.merge(
	NetworkSchema.pick({ env: true })
);

export const PostMessageDataRequestIcrcStrictSchema = IcCanistersStrictSchema.merge(
	NetworkSchema.pick({ env: true })
);

export const PostMessageDataRequestDip20Schema = z.object({
	canisterId: CanisterIdTextSchema
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

export const PostMessageResponseSchema = z.enum([
	'signOutIdleTimer',
	'delegationRemainingTime',
	'syncExchange',
	'syncExchangeError',
	'syncIcpWallet',
	'syncIcrcWallet',
	'syncDip20Wallet',
	'syncBtcWallet',
	'syncSolWallet',
	'syncIcpWalletError',
	'syncIcrcWalletError',
	'syncDip20WalletError',
	'syncBtcWalletError',
	'syncSolWalletError',
	'syncIcpWalletCleanUp',
	'syncIcrcWalletCleanUp',
	'syncDip20WalletCleanUp',
	'syncBtcStatuses',
	'syncBtcStatusesError',
	'syncCkMinterInfo',
	'syncCkMinterInfoError',
	'syncBtcPendingUtxos',
	'syncCkBTCUpdateOk',
	'syncBtcAddress',
	'syncPowProtection',
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
	currentIcrcPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentSolPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentSplPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentBnbPrice: z.custom<CoingeckoSimplePriceResponse>()
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
