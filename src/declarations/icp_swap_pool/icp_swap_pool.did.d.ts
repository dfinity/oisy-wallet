import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
}
export interface AccountBalance {
	balance0: bigint;
	balance1: bigint;
}
export type Action =
	| { Withdraw: WithdrawInfo }
	| { RemoveLimitOrder: RemoveLimitOrderInfo }
	| { AddLiquidity: AddLiquidityInfo }
	| { OneStepSwap: OneStepSwapInfo }
	| { Deposit: DepositInfo }
	| { Refund: RefundInfo }
	| { Swap: SwapInfo }
	| { ExecuteLimitOrder: ExecuteLimitOrderInfo }
	| { TransferPosition: TransferPositionInfo }
	| { DecreaseLiquidity: DecreaseLiquidityInfo }
	| { Claim: ClaimInfo }
	| { AddLimitOrder: AddLimitOrderInfo };
export interface AddLimitOrderInfo {
	err: [] | [Error__1];
	status: AddLimitOrderStatus;
	token1AmountIn: bigint;
	token0AmountIn: bigint;
	positionId: bigint;
	token0: Token__1;
	token1: Token__1;
	tickLimit: bigint;
}
export type AddLimitOrderStatus = { Failed: null } | { Created: null } | { Completed: null };
export interface AddLiquidityInfo {
	err: [] | [Error__1];
	status: AddLiquidityStatus;
	liquidity: bigint;
	positionId: bigint;
	amount0: bigint;
	amount1: bigint;
	token0: Token__1;
	token1: Token__1;
}
export type AddLiquidityStatus = { Failed: null } | { Created: null } | { Completed: null };
export type Amount = bigint;
export interface ClaimArgs {
	positionId: bigint;
}
export interface ClaimInfo {
	err: [] | [Error__1];
	status: ClaimStatus;
	positionId: bigint;
	amount0: bigint;
	amount1: bigint;
	token0: Token__1;
	token1: Token__1;
}
export type ClaimStatus = { Failed: null } | { Created: null } | { Completed: null };
export interface CycleInfo {
	balance: bigint;
	available: bigint;
}
export interface DecreaseLiquidityArgs {
	liquidity: string;
	positionId: bigint;
}
export interface DecreaseLiquidityInfo {
	err: [] | [Error__1];
	status: DecreaseLiquidityStatus;
	liquidity: bigint;
	positionId: bigint;
	amount0: bigint;
	amount1: bigint;
	token0: Token__1;
	token1: Token__1;
}
export type DecreaseLiquidityStatus = { Failed: null } | { Created: null } | { Completed: null };
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
export interface DepositAndSwapArgs {
	tokenInFee: bigint;
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
	tokenOutFee: bigint;
}
export interface DepositArgs {
	fee: bigint;
	token: string;
	amount: bigint;
}
export interface DepositInfo {
	err: [] | [Error__1];
	status: DepositStatus;
	transfer: Transfer;
}
export type DepositStatus =
	| { Failed: null }
	| { TransferCompleted: null }
	| { Created: null }
	| { Completed: null };
export type Error =
	| { CommonError: null }
	| { InternalError: string }
	| { UnsupportedToken: string }
	| { InsufficientFunds: null };
export type Error__1 = string;
export interface ExecuteLimitOrderInfo {
	err: [] | [Error__1];
	status: ExecuteLimitOrderStatus;
	token1AmountIn: bigint;
	token0AmountIn: bigint;
	positionId: bigint;
	token1AmountOut: bigint;
	token0: Token__1;
	token1: Token__1;
	token0AmountOut: bigint;
	tickLimit: bigint;
}
export type ExecuteLimitOrderStatus = { Failed: null } | { Created: null } | { Completed: null };
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
export interface OneStepSwapInfo {
	err: [] | [Error__1];
	status: OneStepSwapStatus;
	withdraw: WithdrawInfo;
	swap: SwapInfo;
	deposit: DepositInfo;
}
export type OneStepSwapStatus =
	| { SwapCompleted: null }
	| { Failed: null }
	| { PreSwapCompleted: null }
	| { DepositCreditCompleted: null }
	| { DepositTransferCompleted: null }
	| { Created: null }
	| { WithdrawCreditCompleted: null }
	| { Completed: null };
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
export interface PoolInitArgs {
	infoCid: Principal;
	positionIndexCid: Principal;
	trustedCanisterManagerCid: Principal;
	token0: Token;
	token1: Token;
	feeReceiverCid: Principal;
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
export interface RefundInfo {
	err: [] | [Error__1];
	status: RefundStatus;
	relatedIndex: bigint;
	transfer: Transfer;
}
export type RefundStatus =
	| { Failed: null }
	| { CreditCompleted: null }
	| { Created: null }
	| { Completed: null };
export interface RemoveLimitOrderInfo {
	err: [] | [Error__1];
	status: RemoveLimitOrderStatus;
	token1AmountIn: bigint;
	token0AmountIn: bigint;
	positionId: bigint;
	token1AmountOut: bigint;
	token0: Token__1;
	token1: Token__1;
	token0AmountOut: bigint;
	tickLimit: bigint;
}
export type RemoveLimitOrderStatus =
	| { Failed: null }
	| { LimitOrderDeleted: null }
	| { Created: null }
	| { Completed: null };
export type Result = { ok: bigint } | { err: Error };
export type Result_1 = { ok: string } | { err: Error };
export type Result_10 = { ok: Page } | { err: Error };
export type Result_11 = { ok: Page_1 } | { err: Error };
export type Result_12 = { ok: Array<bigint> } | { err: Error };
export type Result_13 = { ok: Array<[string, Array<bigint>]> } | { err: Error };
export type Result_14 = { ok: UserPositionInfo } | { err: Error };
export type Result_15 =
	| {
			ok: {
				upperLimitOrdersIds: Array<{ userPositionId: bigint; timestamp: bigint }>;
				lowerLimitOrderIds: Array<{ userPositionId: bigint; timestamp: bigint }>;
			};
	  }
	| { err: Error };
export type Result_16 = { ok: Array<[bigint, Transaction]> } | { err: Error };
export type Result_17 =
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
export type Result_18 = { ok: Page_2 } | { err: Error };
export type Result_19 = { ok: Page_3 } | { err: Error };
export type Result_2 = { ok: boolean } | { err: Error };
export type Result_20 = { ok: Array<[bigint, bigint]> } | { err: Error };
export type Result_21 =
	| {
			ok: {
				infoCid: string;
				records: Array<SwapRecordInfo>;
				errors: Array<PushError>;
				retryCount: bigint;
			};
	  }
	| { err: Error };
export type Result_22 =
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
export type Result_23 = { ok: Page_4 } | { err: Error };
export type Result_24 = { ok: PositionInfo } | { err: Error };
export type Result_25 =
	| {
			ok: {
				lowerLimitOrders: Array<[LimitOrderKey, LimitOrderValue]>;
				upperLimitOrders: Array<[LimitOrderKey, LimitOrderValue]>;
			};
	  }
	| { err: Error };
export type Result_26 =
	| {
			ok: Array<[LimitOrderType, LimitOrderKey, LimitOrderValue]>;
	  }
	| { err: Error };
export type Result_27 = { ok: PoolInitArgs } | { err: Error };
export type Result_28 =
	| {
			ok: { feeGrowthGlobal1X128: bigint; feeGrowthGlobal0X128: bigint };
	  }
	| { err: Error };
export type Result_29 = { ok: CycleInfo } | { err: Error };
export type Result_3 = { ok: bigint } | { err: Error };
export type Result_30 = { ok: { amount0: bigint; amount1: bigint } } | { err: Error };
export type Result_31 =
	| {
			ok: {
				tokenIncome: Array<[bigint, { tokensOwed0: bigint; tokensOwed1: bigint }]>;
				totalTokensOwed0: bigint;
				totalTokensOwed1: bigint;
			};
	  }
	| { err: Error };
export type Result_32 = { ok: Page_5 } | { err: Error };
export type Result_4 = { ok: null } | { err: Error };
export type Result_5 = { ok: boolean } | { err: null };
export type Result_6 =
	| {
			ok: { tokensOwed0: bigint; tokensOwed1: bigint };
	  }
	| { err: Error };
export type Result_7 = { ok: PoolMetadata } | { err: Error };
export type Result_8 = { ok: { balance0: bigint; balance1: bigint } } | { err: Error };
export type Result_9 = { ok: Array<UserPositionInfoWithId> } | { err: Error };
export interface SwapArgs {
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
}
export interface SwapInfo {
	err: [] | [Error__1];
	status: SwapStatus;
	tokenIn: Token__1;
	tokenOut: Token__1;
	amountOutFee: bigint;
	amountIn: Amount;
	amountOut: bigint;
	amountInFee: bigint;
}
export interface SwapPool {
	activeJobs: ActorMethod<[], undefined>;
	addLimitOrder: ActorMethod<[LimitOrderArgs], Result_2>;
	allTokenBalance: ActorMethod<[bigint, bigint], Result_32>;
	approvePosition: ActorMethod<[Principal, bigint], Result_2>;
	batchRefreshIncome: ActorMethod<[Array<bigint>], Result_31>;
	checkOwnerOfUserPosition: ActorMethod<[Principal, bigint], Result_2>;
	claim: ActorMethod<[ClaimArgs], Result_30>;
	decreaseLiquidity: ActorMethod<[DecreaseLiquidityArgs], Result_30>;
	deleteFailedTransaction: ActorMethod<[bigint, boolean], Result_2>;
	deposit: ActorMethod<[DepositArgs], Result>;
	depositAllAndMint: ActorMethod<[DepositAndMintArgs], Result>;
	depositAndSwap: ActorMethod<[DepositAndSwapArgs], Result>;
	depositFrom: ActorMethod<[DepositArgs], Result>;
	depositFromAndSwap: ActorMethod<[DepositAndSwapArgs], Result>;
	getAdmins: ActorMethod<[], Array<Principal>>;
	getAvailabilityState: ActorMethod<[], { whiteList: Array<Principal>; available: boolean }>;
	getCachedTokenFee: ActorMethod<[], { token0Fee: bigint; token1Fee: bigint }>;
	getClaimLog: ActorMethod<[], Array<string>>;
	getCycleInfo: ActorMethod<[], Result_29>;
	getFailedTransactions: ActorMethod<[], Result_16>;
	getFeeGrowthGlobal: ActorMethod<[], Result_28>;
	getInitArgs: ActorMethod<[], Result_27>;
	getJobs: ActorMethod<[], { jobs: Array<JobInfo>; level: Level }>;
	getLimitOrderAvailabilityState: ActorMethod<[], Result_2>;
	getLimitOrderStack: ActorMethod<[], Result_26>;
	getLimitOrders: ActorMethod<[], Result_25>;
	getMistransferBalance: ActorMethod<[Token], Result>;
	getPosition: ActorMethod<[GetPositionArgs], Result_24>;
	getPositions: ActorMethod<[bigint, bigint], Result_23>;
	getSortedUserLimitOrders: ActorMethod<[Principal], Result_22>;
	getSwapRecordState: ActorMethod<[], Result_21>;
	getTickBitmaps: ActorMethod<[], Result_20>;
	getTickInfos: ActorMethod<[bigint, bigint], Result_19>;
	getTicks: ActorMethod<[bigint, bigint], Result_18>;
	getTokenAmountState: ActorMethod<[], Result_17>;
	getTokenBalance: ActorMethod<[], { token0: bigint; token1: bigint }>;
	getTransactions: ActorMethod<[], Result_16>;
	getTransactionsByOwner: ActorMethod<[Principal], Result_16>;
	getUserByPositionId: ActorMethod<[bigint], Result_1>;
	getUserLimitOrders: ActorMethod<[Principal], Result_15>;
	getUserPosition: ActorMethod<[bigint], Result_14>;
	getUserPositionIds: ActorMethod<[], Result_13>;
	getUserPositionIdsByPrincipal: ActorMethod<[Principal], Result_12>;
	getUserPositionWithTokenAmount: ActorMethod<[bigint, bigint], Result_11>;
	getUserPositions: ActorMethod<[bigint, bigint], Result_10>;
	getUserPositionsByPrincipal: ActorMethod<[Principal], Result_9>;
	getUserUnusedBalance: ActorMethod<[Principal], Result_8>;
	getVersion: ActorMethod<[], string>;
	icrc10_supported_standards: ActorMethod<[], Array<{ url: string; name: string }>>;
	icrc21_canister_call_consent_message: ActorMethod<
		[Icrc21ConsentMessageRequest],
		Icrc21ConsentMessageResponse
	>;
	icrc28_trusted_origins: ActorMethod<[], Icrc28TrustedOriginsResponse>;
	increaseLiquidity: ActorMethod<[IncreaseLiquidityArgs], Result>;
	init: ActorMethod<[bigint, bigint, bigint], undefined>;
	metadata: ActorMethod<[], Result_7>;
	mint: ActorMethod<[MintArgs], Result>;
	quote: ActorMethod<[SwapArgs], Result>;
	quoteForAll: ActorMethod<[SwapArgs], Result>;
	refreshIncome: ActorMethod<[bigint], Result_6>;
	removeLimitOrder: ActorMethod<[bigint], Result_2>;
	restartJobs: ActorMethod<[Array<string>], undefined>;
	setAdmins: ActorMethod<[Array<Principal>], undefined>;
	setAvailable: ActorMethod<[boolean], undefined>;
	setIcrc28TrustedOrigins: ActorMethod<[Array<string>], Result_5>;
	setLimitOrderAvailable: ActorMethod<[boolean], undefined>;
	setTokenAmountState: ActorMethod<[bigint, bigint], Result_4>;
	setWhiteList: ActorMethod<[Array<Principal>], undefined>;
	stopJobs: ActorMethod<[Array<string>], undefined>;
	sumTick: ActorMethod<[], Result_3>;
	swap: ActorMethod<[SwapArgs], Result>;
	transferPosition: ActorMethod<[Principal, Principal, bigint], Result_2>;
	updateTokenFee: ActorMethod<[], undefined>;
	upgradeTokenStandard: ActorMethod<[Principal], Result_1>;
	withdraw: ActorMethod<[WithdrawArgs], Result>;
	withdrawMistransferBalance: ActorMethod<[Token], Result>;
	withdrawToSubaccount: ActorMethod<[WithdrawToSubaccountArgs], Result>;
}
export interface SwapRecordInfo {
	currentLiquidity: bigint;
	currentSqrtPriceX96: bigint;
	currentTick: bigint;
	txInfo: Transaction__1;
	poolFee: bigint;
}
export type SwapStatus = { Failed: null } | { Created: null } | { Completed: null };
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
export interface Token__1 {
	address: Principal;
	standard: string;
}
export interface Transaction {
	id: bigint;
	action: Action;
	owner: Principal;
	timestamp: Time;
	canisterId: Principal;
}
export interface Transaction__1 {
	id: bigint;
	action: Action;
	owner: Principal;
	timestamp: Time;
	canisterId: Principal;
}
export interface Transfer {
	to: Account;
	fee: bigint;
	token: Principal;
	from: Account;
	memo: [] | [Uint8Array | number[]];
	index: bigint;
	amount: bigint;
	standard: string;
}
export interface TransferPositionInfo {
	to: Account;
	err: [] | [Error__1];
	status: TransferPositionStatus;
	from: Account;
	positionId: bigint;
	token0Amount: bigint;
	token1Amount: bigint;
}
export type TransferPositionStatus = { Failed: null } | { Created: null } | { Completed: null };
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
export interface WithdrawArgs {
	fee: bigint;
	token: string;
	amount: bigint;
}
export interface WithdrawInfo {
	err: [] | [Error__1];
	status: WithdrawStatus;
	transfer: Transfer;
}
export type WithdrawStatus =
	| { Failed: null }
	| { CreditCompleted: null }
	| { Created: null }
	| { Completed: null };
export interface WithdrawToSubaccountArgs {
	fee: bigint;
	token: string;
	subaccount: Uint8Array | number[];
	amount: bigint;
}
export interface _SERVICE extends SwapPool {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
