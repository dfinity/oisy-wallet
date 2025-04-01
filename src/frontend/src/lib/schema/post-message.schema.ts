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

export const PostMessageRequestSchema = z.enum([
	'startIdleTimer',
	'stopIdleTimer',
	'startCodeTimer',
	'stopCodeTimer',
	'startExchangeTimer',
	'stopExchangeTimer',
	'startPowTimer',
	'stopPowTimer',
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
	'triggerCkBtcMinterInfoTimer',
	'initSignerAllowance',
	'solvePowChallenge',
	'allowSigner'
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
	'createPowChallenge',
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

export const PostMessageDataRequestCreateChallengeSchema = PostMessageDataResponseSchema.extend({
	test: z.string().optional()
});

export const PostMessageDataResponseCreateChallengeSchema = PostMessageDataResponseSchema.extend({
	error: z.unknown()
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

// -----------------------------------------------------------------------------
// - The post message schemas used by the pow.worker.ts and worker.pow.services.ts
// -----------------------------------------------------------------------------

// Base message format with discriminator, request ID, and message type

// Base schema with message metadata
export const PostMessageBaseSchema = z.object({
	message: z.string(),
	requestId: z.string(),
	type: z.union([z.literal('request'), z.literal('response')]),
	tag: z.union([z.literal('Ok'), z.literal('Err')])
});

export const PostMessageRequestBaseSchema = PostMessageBaseSchema.extend({
	type: z.literal('request')
});

export const PostMessageResponseBaseSchema = PostMessageBaseSchema.extend({
	type: z.literal('response')
});

export const PostMessageCreatePowChallengeRequestSchema = PostMessageRequestBaseSchema.extend({
	message: z.literal('CreatePowChallengeRequest')
});

export const PostMessageCreatePowChallengeResponseDataSchema = z.object({
	difficulty: z.number(),
	start_timestamp_ms: z.bigint(),
	expiry_timestamp_ms: z.bigint()
});

export const PostMessageCreatePowChallengeErrorSchema = z.union([
	z.object({ ChallengeInProgress: z.null() }),
	z.object({ MissingUserProfile: z.null() }),
	z.object({ RandomnessError: z.string() })
]);

export const PostMessageCreatePowChallengeResponseSchema = PostMessageResponseBaseSchema.extend({
	message: z.literal('CreatePowChallengeResponse'),
	data: z.union([
		PostMessageCreatePowChallengeResponseDataSchema,
		PostMessageCreatePowChallengeErrorSchema
	])
});

export const PostMessageChallengeCompletionSchema = z.object({
	solved_duration_ms: z.bigint(),
	next_allowance_ms: z.bigint(),
	next_difficulty: z.number(),
	current_difficulty: z.number()
});

export const PostMessageAllowSigningRequestSchema = PostMessageRequestBaseSchema.extend({
	message: z.literal('AllowSigningRequest'),
	data: z.object({
		nonce: z.bigint()
	})
});

export const PostMessageAllowSigningStatusSchema = z.enum(['Skipped', 'Failed', 'Executed']);

export const PostMessageAllowSigningResponseDataSchema = z.object({
	status: PostMessageAllowSigningStatusSchema,
	challenge_completion: z.array(PostMessageChallengeCompletionSchema).max(1),
	allowed_cycles: z.bigint()
});

export const PostMessageApproveErrorSchema = z.string();

export const PostMessageChallengeCompletionErrorSchema = z.string();

export const PostMessageAllowSigningErrorSchema = z.union([
	z.object({ ApproveError: PostMessageApproveErrorSchema }),
	z.object({ PowChallenge: PostMessageChallengeCompletionErrorSchema }),
	z.object({ Other: z.string() }),
	z.object({ FailedToContactCyclesLedger: z.null() })
]);

export const PostMessageAllowSigningResponseSchema = PostMessageResponseBaseSchema.extend({
	message: z.literal('AllowSigningResponse'),
	data: z.union([PostMessageAllowSigningResponseDataSchema, PostMessageAllowSigningErrorSchema])
});
