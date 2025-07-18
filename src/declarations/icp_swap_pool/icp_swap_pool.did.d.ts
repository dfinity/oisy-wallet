import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface AccountBalance {
	balance0: bigint;
	balance1: bigint;
}
export interface ClaimArgs {
	positionId: bigint;
}
export interface CycleInfo {
	balance: bigint;
	available: bigint;
}
export interface DecreaseLiquidityArgs {
	liquidity: string;
	positionId: bigint;
}
export interface DepositAndMintArgs {
	tickUpper: bigint;
	fee0: bigint;
	fee1: bigint;
	amount0: bigint;
	amount1: bigint;
	positionOwner: Principal;
	amount0Desired: string;
	amount1Desired: string;
	tickLower: bigint;
}
export interface DepositArgs {
	fee: bigint;
	token: string;
	amount: bigint;
}
export type Error =
	| { CommonError: null }
	| { InternalError: string }
	| { UnsupportedToken: string }
	| { InsufficientFunds: null };
export interface GetPositionArgs {
	tickUpper: bigint;
	tickLower: bigint;
}
export interface Icrc21ConsentInfo {
	metadata: Icrc21ConsentMessageMetadata;
	consent_message: Icrc21ConsentMessage;
}
export type Icrc21ConsentMessage =
	| {
			LineDisplayMessage: { pages: Array<{ lines: Array<string> }> };
	  }
	| { GenericDisplayMessage: string };
export interface Icrc21ConsentMessageMetadata {
	utc_offset_minutes: [] | [number];
	language: string;
}
export interface Icrc21ConsentMessageRequest {
	arg: Uint8Array | number[];
	method: string;
	user_preferences: Icrc21ConsentMessageSpec;
}
export type Icrc21ConsentMessageResponse = { Ok: Icrc21ConsentInfo } | { Err: Icrc21Error };
export interface Icrc21ConsentMessageSpec {
	metadata: Icrc21ConsentMessageMetadata;
	device_spec:
		| []
		| [
				| { GenericDisplay: null }
				| {
						LineDisplay: {
							characters_per_line: number;
							lines_per_page: number;
						};
				  }
		  ];
}
export type Icrc21Error =
	| {
			GenericError: { description: string; error_code: bigint };
	  }
	| { InsufficientPayment: Icrc21ErrorInfo }
	| { UnsupportedCanisterCall: Icrc21ErrorInfo }
	| { ConsentMessageUnavailable: Icrc21ErrorInfo };
export interface Icrc21ErrorInfo {
	description: string;
}
export interface Icrc28TrustedOriginsResponse {
	trusted_origins: Array<string>;
}
export interface IncreaseLiquidityArgs {
	positionId: bigint;
	amount0Desired: string;
	amount1Desired: string;
}
export interface JobInfo {
	interval: bigint;
	name: string;
	lastRun: Time;
	timerId: [] | [bigint];
}
export type Level = { Inactive: null } | { Active: null };
export interface LimitOrderArgs {
	positionId: bigint;
	tickLimit: bigint;
}
export interface LimitOrderKey {
	timestamp: bigint;
	tickLimit: bigint;
}
export type LimitOrderType = { Lower: null } | { Upper: null };
export interface LimitOrderValue {
	userPositionId: bigint;
	token0InAmount: bigint;
	owner: Principal;
	token1InAmount: bigint;
}
export interface MintArgs {
	fee: bigint;
	tickUpper: bigint;
	token0: string;
	token1: string;
	amount0Desired: string;
	amount1Desired: string;
	tickLower: bigint;
}
export interface Page {
	content: Array<UserPositionInfoWithId>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface Page_1 {
	content: Array<UserPositionInfoWithTokenAmount>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface Page_2 {
	content: Array<TickInfoWithId>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface Page_3 {
	content: Array<TickLiquidityInfo>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface Page_4 {
	content: Array<PositionInfoWithId>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface Page_5 {
	content: Array<[Principal, AccountBalance]>;
	offset: bigint;
	limit: bigint;
	totalElements: bigint;
}
export interface PoolMetadata {
	fee: bigint;
	key: string;
	sqrtPriceX96: bigint;
	tick: bigint;
	liquidity: bigint;
	token0: Token;
	token1: Token;
	maxLiquidityPerTick: bigint;
	nextPositionId: bigint;
}
export interface PositionInfo {
	tokensOwed0: bigint;
	tokensOwed1: bigint;
	feeGrowthInside1LastX128: bigint;
	liquidity: bigint;
	feeGrowthInside0LastX128: bigint;
}
export interface PositionInfoWithId {
	id: string;
	tokensOwed0: bigint;
	tokensOwed1: bigint;
	feeGrowthInside1LastX128: bigint;
	liquidity: bigint;
	feeGrowthInside0LastX128: bigint;
}
export interface PushError {
	time: bigint;
	message: string;
}
export type Result = { ok: bigint } | { err: Error };
export type Result_1 = { ok: string } | { err: Error };
export type Result_10 = { ok: Page_1 } | { err: Error };
export type Result_11 = { ok: Array<bigint> } | { err: Error };
export type Result_12 = { ok: Array<[string, Array<bigint>]> } | { err: Error };
export type Result_13 = { ok: UserPositionInfo } | { err: Error };
export type Result_14 =
	| {
			ok: {
				upperLimitOrdersIds: Array<{ userPositionId: bigint; timestamp: bigint }>;
				lowerLimitOrderIds: Array<{ userPositionId: bigint; timestamp: bigint }>;
			};
	  }
	| { err: Error };
export type Result_15 = { ok: Array<TransferLog> } | { err: Error };
export type Result_16 =
	| {
			ok: {
				swapFee0Repurchase: bigint;
				token0Amount: bigint;
				swapFeeReceiver: string;
				token1Amount: bigint;
				swapFee1Repurchase: bigint;
			};
	  }
	| { err: Error };
export type Result_17 = { ok: Page_2 } | { err: Error };
export type Result_18 = { ok: Page_3 } | { err: Error };
export type Result_19 = { ok: Array<[bigint, bigint]> } | { err: Error };
export type Result_2 = { ok: boolean } | { err: Error };
export type Result_20 =
	| {
			ok: {
				infoCid: string;
				records: Array<SwapRecordInfo>;
				errors: Array<PushError>;
				retryCount: bigint;
			};
	  }
	| { err: Error };
export type Result_21 =
	| {
			ok: Array<{
				userPositionId: bigint;
				token0InAmount: bigint;
				timestamp: bigint;
				tickLimit: bigint;
				token1InAmount: bigint;
			}>;
	  }
	| { err: Error };
export type Result_22 = { ok: Page_4 } | { err: Error };
export type Result_23 = { ok: PositionInfo } | { err: Error };
export type Result_24 =
	| {
			ok: {
				lowerLimitOrders: Array<[LimitOrderKey, LimitOrderValue]>;
				upperLimitOrders: Array<[LimitOrderKey, LimitOrderValue]>;
			};
	  }
	| { err: Error };
export type Result_25 =
	| {
			ok: Array<[LimitOrderType, LimitOrderKey, LimitOrderValue]>;
	  }
	| { err: Error };
export type Result_26 =
	| {
			ok: {
				infoCid: Principal;
				trustedCanisterManagerCid: Principal;
				token0: Token;
				token1: Token;
				feeReceiverCid: Principal;
			};
	  }
	| { err: Error };
export type Result_27 =
	| {
			ok: { feeGrowthGlobal1X128: bigint; feeGrowthGlobal0X128: bigint };
	  }
	| { err: Error };
export type Result_28 = { ok: CycleInfo } | { err: Error };
export type Result_29 = { ok: { amount0: bigint; amount1: bigint } } | { err: Error };
export type Result_3 = { ok: bigint } | { err: Error };
export type Result_30 =
	| {
			ok: {
				tokenIncome: Array<[bigint, { tokensOwed0: bigint; tokensOwed1: bigint }]>;
				totalTokensOwed0: bigint;
				totalTokensOwed1: bigint;
			};
	  }
	| { err: Error };
export type Result_31 = { ok: Page_5 } | { err: Error };
export type Result_4 = { ok: boolean } | { err: null };
export type Result_5 =
	| {
			ok: { tokensOwed0: bigint; tokensOwed1: bigint };
	  }
	| { err: Error };
export type Result_6 = { ok: PoolMetadata } | { err: Error };
export type Result_7 = { ok: { balance0: bigint; balance1: bigint } } | { err: Error };
export type Result_8 = { ok: Array<UserPositionInfoWithId> } | { err: Error };
export type Result_9 = { ok: Page } | { err: Error };
export interface SwapArgs {
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
}
export interface SwapPool {
	activeJobs: ActorMethod<[], undefined>;
	addLimitOrder: ActorMethod<[LimitOrderArgs], Result_2>;
	allTokenBalance: ActorMethod<[bigint, bigint], Result_31>;
	approvePosition: ActorMethod<[Principal, bigint], Result_2>;
	batchRefreshIncome: ActorMethod<[Array<bigint>], Result_30>;
	checkOwnerOfUserPosition: ActorMethod<[Principal, bigint], Result_2>;
	claim: ActorMethod<[ClaimArgs], Result_29>;
	decreaseLiquidity: ActorMethod<[DecreaseLiquidityArgs], Result_29>;
	deposit: ActorMethod<[DepositArgs], Result>;
	depositAllAndMint: ActorMethod<[DepositAndMintArgs], Result>;
	depositFrom: ActorMethod<[DepositArgs], Result>;
	getAdmins: ActorMethod<[], Array<Principal>>;
	getAvailabilityState: ActorMethod<[], { whiteList: Array<Principal>; available: boolean }>;
	getClaimLog: ActorMethod<[], Array<string>>;
	getCycleInfo: ActorMethod<[], Result_28>;
	getFeeGrowthGlobal: ActorMethod<[], Result_27>;
	getInitArgs: ActorMethod<[], Result_26>;
	getJobs: ActorMethod<[], { jobs: Array<JobInfo>; level: Level }>;
	getLimitOrderAvailabilityState: ActorMethod<[], Result_2>;
	getLimitOrderStack: ActorMethod<[], Result_25>;
	getLimitOrders: ActorMethod<[], Result_24>;
	getMistransferBalance: ActorMethod<[Token], Result>;
	getPosition: ActorMethod<[GetPositionArgs], Result_23>;
	getPositions: ActorMethod<[bigint, bigint], Result_22>;
	getSortedUserLimitOrders: ActorMethod<[Principal], Result_21>;
	getSwapRecordState: ActorMethod<[], Result_20>;
	getTickBitmaps: ActorMethod<[], Result_19>;
	getTickInfos: ActorMethod<[bigint, bigint], Result_18>;
	getTicks: ActorMethod<[bigint, bigint], Result_17>;
	getTokenAmountState: ActorMethod<[], Result_16>;
	getTokenBalance: ActorMethod<[], { token0: bigint; token1: bigint }>;
	getTokenMeta: ActorMethod<
		[],
		{
			token0: Array<[string, Value]>;
			token1: Array<[string, Value]>;
			token0Fee: [] | [bigint];
			token1Fee: [] | [bigint];
		}
	>;
	getTransferLogs: ActorMethod<[], Result_15>;
	getUserByPositionId: ActorMethod<[bigint], Result_1>;
	getUserLimitOrders: ActorMethod<[Principal], Result_14>;
	getUserPosition: ActorMethod<[bigint], Result_13>;
	getUserPositionIds: ActorMethod<[], Result_12>;
	getUserPositionIdsByPrincipal: ActorMethod<[Principal], Result_11>;
	getUserPositionWithTokenAmount: ActorMethod<[bigint, bigint], Result_10>;
	getUserPositions: ActorMethod<[bigint, bigint], Result_9>;
	getUserPositionsByPrincipal: ActorMethod<[Principal], Result_8>;
	getUserUnusedBalance: ActorMethod<[Principal], Result_7>;
	getVersion: ActorMethod<[], string>;
	icrc10_supported_standards: ActorMethod<[], Array<{ url: string; name: string }>>;
	icrc21_canister_call_consent_message: ActorMethod<
		[Icrc21ConsentMessageRequest],
		Icrc21ConsentMessageResponse
	>;
	icrc28_trusted_origins: ActorMethod<[], Icrc28TrustedOriginsResponse>;
	increaseLiquidity: ActorMethod<[IncreaseLiquidityArgs], Result>;
	init: ActorMethod<[bigint, bigint, bigint], undefined>;
	metadata: ActorMethod<[], Result_6>;
	mint: ActorMethod<[MintArgs], Result>;
	quote: ActorMethod<[SwapArgs], Result>;
	quoteForAll: ActorMethod<[SwapArgs], Result>;
	refreshIncome: ActorMethod<[bigint], Result_5>;
	removeErrorTransferLog: ActorMethod<[bigint, boolean], undefined>;
	removeLimitOrder: ActorMethod<[bigint], Result_2>;
	restartJobs: ActorMethod<[Array<string>], undefined>;
	setAdmins: ActorMethod<[Array<Principal>], undefined>;
	setAvailable: ActorMethod<[boolean], undefined>;
	setIcrc28TrustedOrigins: ActorMethod<[Array<string>], Result_4>;
	setLimitOrderAvailable: ActorMethod<[boolean], undefined>;
	setWhiteList: ActorMethod<[Array<Principal>], undefined>;
	stopJobs: ActorMethod<[Array<string>], undefined>;
	sumTick: ActorMethod<[], Result_3>;
	swap: ActorMethod<[SwapArgs], Result>;
	transferPosition: ActorMethod<[Principal, Principal, bigint], Result_2>;
	upgradeTokenStandard: ActorMethod<[Principal], Result_1>;
	withdraw: ActorMethod<[WithdrawArgs], Result>;
	withdrawMistransferBalance: ActorMethod<[Token], Result>;
	withdrawToSubaccount: ActorMethod<[WithdrawToSubaccountArgs], Result>;
}
export interface SwapRecordInfo {
	to: string;
	feeAmount: bigint;
	action: TransactionType;
	feeAmountTotal: bigint;
	token0Id: string;
	token1Id: string;
	token0AmountTotal: bigint;
	liquidityTotal: bigint;
	from: string;
	tick: bigint;
	feeTire: bigint;
	recipient: string;
	token0ChangeAmount: bigint;
	token1AmountTotal: bigint;
	liquidityChange: bigint;
	token1Standard: string;
	TVLToken0: bigint;
	TVLToken1: bigint;
	token0Fee: bigint;
	token1Fee: bigint;
	timestamp: bigint;
	token1ChangeAmount: bigint;
	token0Standard: string;
	price: bigint;
	poolId: string;
}
export interface TickInfoWithId {
	id: string;
	initialized: boolean;
	feeGrowthOutside1X128: bigint;
	secondsPerLiquidityOutsideX128: bigint;
	liquidityNet: bigint;
	secondsOutside: bigint;
	liquidityGross: bigint;
	feeGrowthOutside0X128: bigint;
	tickCumulativeOutside: bigint;
}
export interface TickLiquidityInfo {
	tickIndex: bigint;
	price0Decimal: bigint;
	liquidityNet: bigint;
	price0: bigint;
	price1: bigint;
	liquidityGross: bigint;
	price1Decimal: bigint;
}
export type Time = bigint;
export interface Token {
	address: string;
	standard: string;
}
export type TransactionType =
	| { decreaseLiquidity: null }
	| {
			limitOrder: {
				token0InAmount: bigint;
				positionId: bigint;
				tickLimit: bigint;
				token1InAmount: bigint;
			};
	  }
	| { claim: null }
	| { swap: null }
	| { addLiquidity: null }
	| { transferPosition: bigint }
	| { increaseLiquidity: null };
export interface TransferLog {
	to: Principal;
	fee: bigint;
	result: string;
	token: Token;
	action: string;
	daysFrom19700101: bigint;
	owner: Principal;
	from: Principal;
	fromSubaccount: [] | [Uint8Array | number[]];
	timestamp: bigint;
	index: bigint;
	amount: bigint;
	errorMsg: string;
	toSubaccount: [] | [Uint8Array | number[]];
}
export interface UserPositionInfo {
	tickUpper: bigint;
	tokensOwed0: bigint;
	tokensOwed1: bigint;
	feeGrowthInside1LastX128: bigint;
	liquidity: bigint;
	feeGrowthInside0LastX128: bigint;
	tickLower: bigint;
}
export interface UserPositionInfoWithId {
	id: bigint;
	tickUpper: bigint;
	tokensOwed0: bigint;
	tokensOwed1: bigint;
	feeGrowthInside1LastX128: bigint;
	liquidity: bigint;
	feeGrowthInside0LastX128: bigint;
	tickLower: bigint;
}
export interface UserPositionInfoWithTokenAmount {
	id: bigint;
	tickUpper: bigint;
	tokensOwed0: bigint;
	tokensOwed1: bigint;
	feeGrowthInside1LastX128: bigint;
	liquidity: bigint;
	feeGrowthInside0LastX128: bigint;
	token0Amount: bigint;
	token1Amount: bigint;
	tickLower: bigint;
}
export type Value =
	| { Int: bigint }
	| { Nat: bigint }
	| { Blob: Uint8Array | number[] }
	| { Text: string };
export interface WithdrawArgs {
	fee: bigint;
	token: string;
	amount: bigint;
}
export interface WithdrawToSubaccountArgs {
	fee: bigint;
	token: string;
	subaccount: Uint8Array | number[];
	amount: bigint;
}
export interface _SERVICE extends SwapPool {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
