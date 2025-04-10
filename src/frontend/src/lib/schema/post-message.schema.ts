import type { Erc20ContractAddress } from '$eth/types/erc20';
import { IcCanistersSchema, IcCanistersStrictSchema, IcCkMetadataSchema } from '$icp/schema/ic-token.schema';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { JsonText } from '$icp/types/btc.post-message';
import { NetworkSchema } from '$lib/schema/network.schema';
import { SyncStateSchema } from '$lib/schema/sync.schema';
import type { BtcAddress, SolAddress } from '$lib/types/address';
import { CanisterIdTextSchema, type OptionCanisterIdText } from '$lib/types/canister';
import type { CoingeckoSimplePriceResponse, CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import type { CertifiedData } from '$lib/types/store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import * as z from 'zod';

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
]);

export const PostMessageDataRequestSchema = z.never();
export const PostMessageDataResponseSchema = z.object({}).strict();

export const PostMessageDataRequestExchangeTimerSchema = z.object({
	// TODO: generate zod schema for Erc20ContractAddress
	erc20Addresses: z.array(z.custom<Erc20ContractAddress>()),
	icrcCanisterIds: z.array(CanisterIdTextSchema),
	splAddresses: z.array(z.custom<SplTokenAddress>())
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
	'syncSolWallet',
	'syncIcpWalletError',
	'syncIcrcWalletError',
	'syncBtcWalletError',
	'syncSolWalletError',
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
	currentIcrcPrices: z.custom<CoingeckoSimpleTokenPriceResponse>(),
	currentSolPrice: z.custom<CoingeckoSimplePriceResponse>(),
	currentSplPrices: z.custom<CoingeckoSimpleTokenPriceResponse>()
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

// -----------------------------------------------------------------------------------------------
// The generic data structures which are required to implement the Short Polling (request-response)
// design pattern used for a simplified communication between the worker(s) and the web application
// The data structure for a request or response to/from a canister call is more or less 1:1 propagated
// by the data structure defined by the schema.
// -----------------------------------------------------------------------------------------------
/**
 * Base schema for all post messages
 */
export const PostMessageBaseSchema = z.object({
	msg: z.string(), // Message type
	requestId: z.string() // Unique identifier for tracking requests and responses
});

/**
 * Base schema for all post message requests
 */
export const PostMessageRequestBaseSchema = PostMessageBaseSchema.extend({
	type: z.literal('request'), // Specifies this is a request
	data: z.unknown().optional() // Optional data payload
});

export const PostMessageErrorSchema = z.string();

/**
 * Base schema for all post message responses
 */
export const PostMessageResponseBaseSchema = PostMessageBaseSchema.extend({
	type: z.literal('response'),
	result: z.union([z.object({ Ok: z.unknown() }), z.object({ Err: PostMessageErrorSchema })])
});

export const CreatePowChallengeRequestDataSchema = z.object({});

export const PostMessageCreatePowChallengeRequestSchema = PostMessageRequestBaseSchema.extend({
	msg: z.literal('CreatePowChallengeRequest'),
	data: CreatePowChallengeRequestDataSchema.optional()
});

export const CreatePowChallengeResponseResultSchema = z.object({
	difficulty: z.number(),
	start_timestamp_ms: z.bigint(),
	expiry_timestamp_ms: z.bigint()
});

export const PostMessageCreatePowChallengeResponseSchema = PostMessageResponseBaseSchema.extend({
	msg: z.literal('CreatePowChallengeResponse'),
	result: z.union([
		z.object({ Ok: CreatePowChallengeResponseResultSchema }),
		z.object({ Err: PostMessageErrorSchema })
	])
});

export const AllowSigningRequestDataSchema = z.object({
	nonce: z.bigint()
});

export const PostMessageAllowSigningRequestSchema = PostMessageRequestBaseSchema.extend({
	msg: z.literal('AllowSigningRequest'),
	data: AllowSigningRequestDataSchema
});

export const ChallengeCompletionSchema = z.object({
	solved_duration_ms: z.bigint(),
	next_allowance_ms: z.bigint(),
	next_difficulty: z.number(),
	current_difficulty: z.number()
});

const AllowSigningStatusSchema = z.union([
	z.object({ Skipped: z.null() }),
	z.object({ Failed: z.null() }),
	z.object({ Executed: z.null() })
]);

export const AllowSigningResponseResultSchema = z.object({
	status: AllowSigningStatusSchema, // Use the corrected schema for status
	challenge_completion: z.array(z.any()).optional(), // Assuming ChallengeCompletion is modeled correctly elsewhere
	allowed_cycles: z.bigint()
});

export const PostMessageAllowSigningResponseSchema = PostMessageResponseBaseSchema.extend({
	msg: z.literal('AllowSigningResponse'),
	result: z.union([
		z.object({ Ok: AllowSigningResponseResultSchema }),
		z.object({ Err: PostMessageErrorSchema })
	])
});
