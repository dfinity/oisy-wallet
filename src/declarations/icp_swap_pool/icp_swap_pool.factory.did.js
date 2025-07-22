// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const Token = IDL.Record({ address: IDL.Text, standard: IDL.Text });
	const LimitOrderArgs = IDL.Record({
		positionId: IDL.Nat,
		tickLimit: IDL.Int
	});
	const Error = IDL.Variant({
		CommonError: IDL.Null,
		InternalError: IDL.Text,
		UnsupportedToken: IDL.Text,
		InsufficientFunds: IDL.Null
	});
	const Result_2 = IDL.Variant({ ok: IDL.Bool, err: Error });
	const AccountBalance = IDL.Record({
		balance0: IDL.Nat,
		balance1: IDL.Nat
	});
	const Page_5 = IDL.Record({
		content: IDL.Vec(IDL.Tuple(IDL.Principal, AccountBalance)),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_32 = IDL.Variant({ ok: Page_5, err: Error });
	const Result_31 = IDL.Variant({
		ok: IDL.Record({
			tokenIncome: IDL.Vec(
				IDL.Tuple(IDL.Nat, IDL.Record({ tokensOwed0: IDL.Nat, tokensOwed1: IDL.Nat }))
			),
			totalTokensOwed0: IDL.Nat,
			totalTokensOwed1: IDL.Nat
		}),
		err: Error
	});
	const ClaimArgs = IDL.Record({ positionId: IDL.Nat });
	const Result_30 = IDL.Variant({
		ok: IDL.Record({ amount0: IDL.Nat, amount1: IDL.Nat }),
		err: Error
	});
	const DecreaseLiquidityArgs = IDL.Record({
		liquidity: IDL.Text,
		positionId: IDL.Nat
	});
	const DepositArgs = IDL.Record({
		fee: IDL.Nat,
		token: IDL.Text,
		amount: IDL.Nat
	});
	const Result = IDL.Variant({ ok: IDL.Nat, err: Error });
	const DepositAndMintArgs = IDL.Record({
		tickUpper: IDL.Int,
		fee0: IDL.Nat,
		fee1: IDL.Nat,
		amount0: IDL.Nat,
		amount1: IDL.Nat,
		positionOwner: IDL.Principal,
		amount0Desired: IDL.Text,
		amount1Desired: IDL.Text,
		tickLower: IDL.Int
	});
	const DepositAndSwapArgs = IDL.Record({
		tokenInFee: IDL.Nat,
		amountIn: IDL.Text,
		zeroForOne: IDL.Bool,
		amountOutMinimum: IDL.Text,
		tokenOutFee: IDL.Nat
	});
	const CycleInfo = IDL.Record({ balance: IDL.Nat, available: IDL.Nat });
	const Result_29 = IDL.Variant({ ok: CycleInfo, err: Error });
	const Error__1 = IDL.Text;
	const WithdrawStatus = IDL.Variant({
		Failed: IDL.Null,
		CreditCompleted: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const Transfer = IDL.Record({
		to: Account,
		fee: IDL.Nat,
		token: IDL.Principal,
		from: Account,
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		index: IDL.Nat,
		amount: IDL.Nat,
		standard: IDL.Text
	});
	const WithdrawInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: WithdrawStatus,
		transfer: Transfer
	});
	const RemoveLimitOrderStatus = IDL.Variant({
		Failed: IDL.Null,
		LimitOrderDeleted: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const Token__1 = IDL.Record({
		address: IDL.Principal,
		standard: IDL.Text
	});
	const RemoveLimitOrderInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: RemoveLimitOrderStatus,
		token1AmountIn: IDL.Nat,
		token0AmountIn: IDL.Nat,
		positionId: IDL.Nat,
		token1AmountOut: IDL.Nat,
		token0: Token__1,
		token1: Token__1,
		token0AmountOut: IDL.Nat,
		tickLimit: IDL.Int
	});
	const AddLiquidityStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const AddLiquidityInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: AddLiquidityStatus,
		liquidity: IDL.Nat,
		positionId: IDL.Nat,
		amount0: IDL.Nat,
		amount1: IDL.Nat,
		token0: Token__1,
		token1: Token__1
	});
	const OneStepSwapStatus = IDL.Variant({
		SwapCompleted: IDL.Null,
		Failed: IDL.Null,
		PreSwapCompleted: IDL.Null,
		DepositCreditCompleted: IDL.Null,
		DepositTransferCompleted: IDL.Null,
		Created: IDL.Null,
		WithdrawCreditCompleted: IDL.Null,
		Completed: IDL.Null
	});
	const SwapStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const Amount = IDL.Nat;
	const SwapInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: SwapStatus,
		tokenIn: Token__1,
		tokenOut: Token__1,
		amountOutFee: IDL.Nat,
		amountIn: Amount,
		amountOut: IDL.Nat,
		amountInFee: IDL.Nat
	});
	const DepositStatus = IDL.Variant({
		Failed: IDL.Null,
		TransferCompleted: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const DepositInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: DepositStatus,
		transfer: Transfer
	});
	const OneStepSwapInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: OneStepSwapStatus,
		withdraw: WithdrawInfo,
		swap: SwapInfo,
		deposit: DepositInfo
	});
	const RefundStatus = IDL.Variant({
		Failed: IDL.Null,
		CreditCompleted: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const RefundInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: RefundStatus,
		relatedIndex: IDL.Nat,
		transfer: Transfer
	});
	const ExecuteLimitOrderStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const ExecuteLimitOrderInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: ExecuteLimitOrderStatus,
		token1AmountIn: IDL.Nat,
		token0AmountIn: IDL.Nat,
		positionId: IDL.Nat,
		token1AmountOut: IDL.Nat,
		token0: Token__1,
		token1: Token__1,
		token0AmountOut: IDL.Nat,
		tickLimit: IDL.Int
	});
	const TransferPositionStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const TransferPositionInfo = IDL.Record({
		to: Account,
		err: IDL.Opt(Error__1),
		status: TransferPositionStatus,
		from: Account,
		positionId: IDL.Nat,
		token0Amount: IDL.Nat,
		token1Amount: IDL.Nat
	});
	const DecreaseLiquidityStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const DecreaseLiquidityInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: DecreaseLiquidityStatus,
		liquidity: IDL.Nat,
		positionId: IDL.Nat,
		amount0: IDL.Nat,
		amount1: IDL.Nat,
		token0: Token__1,
		token1: Token__1
	});
	const ClaimStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const ClaimInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: ClaimStatus,
		positionId: IDL.Nat,
		amount0: IDL.Nat,
		amount1: IDL.Nat,
		token0: Token__1,
		token1: Token__1
	});
	const AddLimitOrderStatus = IDL.Variant({
		Failed: IDL.Null,
		Created: IDL.Null,
		Completed: IDL.Null
	});
	const AddLimitOrderInfo = IDL.Record({
		err: IDL.Opt(Error__1),
		status: AddLimitOrderStatus,
		token1AmountIn: IDL.Nat,
		token0AmountIn: IDL.Nat,
		positionId: IDL.Nat,
		token0: Token__1,
		token1: Token__1,
		tickLimit: IDL.Int
	});
	const Action = IDL.Variant({
		Withdraw: WithdrawInfo,
		RemoveLimitOrder: RemoveLimitOrderInfo,
		AddLiquidity: AddLiquidityInfo,
		OneStepSwap: OneStepSwapInfo,
		Deposit: DepositInfo,
		Refund: RefundInfo,
		Swap: SwapInfo,
		ExecuteLimitOrder: ExecuteLimitOrderInfo,
		TransferPosition: TransferPositionInfo,
		DecreaseLiquidity: DecreaseLiquidityInfo,
		Claim: ClaimInfo,
		AddLimitOrder: AddLimitOrderInfo
	});
	const Time = IDL.Int;
	const Transaction = IDL.Record({
		id: IDL.Nat,
		action: Action,
		owner: IDL.Principal,
		timestamp: Time,
		canisterId: IDL.Principal
	});
	const Result_16 = IDL.Variant({
		ok: IDL.Vec(IDL.Tuple(IDL.Nat, Transaction)),
		err: Error
	});
	const Result_28 = IDL.Variant({
		ok: IDL.Record({
			feeGrowthGlobal1X128: IDL.Nat,
			feeGrowthGlobal0X128: IDL.Nat
		}),
		err: Error
	});
	const PoolInitArgs = IDL.Record({
		infoCid: IDL.Principal,
		positionIndexCid: IDL.Principal,
		trustedCanisterManagerCid: IDL.Principal,
		token0: Token,
		token1: Token,
		feeReceiverCid: IDL.Principal
	});
	const Result_27 = IDL.Variant({ ok: PoolInitArgs, err: Error });
	const JobInfo = IDL.Record({
		interval: IDL.Nat,
		name: IDL.Text,
		lastRun: Time,
		timerId: IDL.Opt(IDL.Nat)
	});
	const Level = IDL.Variant({ Inactive: IDL.Null, Active: IDL.Null });
	const LimitOrderType = IDL.Variant({
		Lower: IDL.Null,
		Upper: IDL.Null
	});
	const LimitOrderKey = IDL.Record({
		timestamp: IDL.Nat,
		tickLimit: IDL.Int
	});
	const LimitOrderValue = IDL.Record({
		userPositionId: IDL.Nat,
		token0InAmount: IDL.Nat,
		owner: IDL.Principal,
		token1InAmount: IDL.Nat
	});
	const Result_26 = IDL.Variant({
		ok: IDL.Vec(IDL.Tuple(LimitOrderType, LimitOrderKey, LimitOrderValue)),
		err: Error
	});
	const Result_25 = IDL.Variant({
		ok: IDL.Record({
			lowerLimitOrders: IDL.Vec(IDL.Tuple(LimitOrderKey, LimitOrderValue)),
			upperLimitOrders: IDL.Vec(IDL.Tuple(LimitOrderKey, LimitOrderValue))
		}),
		err: Error
	});
	const GetPositionArgs = IDL.Record({
		tickUpper: IDL.Int,
		tickLower: IDL.Int
	});
	const PositionInfo = IDL.Record({
		tokensOwed0: IDL.Nat,
		tokensOwed1: IDL.Nat,
		feeGrowthInside1LastX128: IDL.Nat,
		liquidity: IDL.Nat,
		feeGrowthInside0LastX128: IDL.Nat
	});
	const Result_24 = IDL.Variant({ ok: PositionInfo, err: Error });
	const PositionInfoWithId = IDL.Record({
		id: IDL.Text,
		tokensOwed0: IDL.Nat,
		tokensOwed1: IDL.Nat,
		feeGrowthInside1LastX128: IDL.Nat,
		liquidity: IDL.Nat,
		feeGrowthInside0LastX128: IDL.Nat
	});
	const Page_4 = IDL.Record({
		content: IDL.Vec(PositionInfoWithId),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_23 = IDL.Variant({ ok: Page_4, err: Error });
	const Result_22 = IDL.Variant({
		ok: IDL.Vec(
			IDL.Record({
				userPositionId: IDL.Nat,
				token0InAmount: IDL.Nat,
				timestamp: IDL.Nat,
				tickLimit: IDL.Int,
				token1InAmount: IDL.Nat
			})
		),
		err: Error
	});
	const Transaction__1 = IDL.Record({
		id: IDL.Nat,
		action: Action,
		owner: IDL.Principal,
		timestamp: Time,
		canisterId: IDL.Principal
	});
	const SwapRecordInfo = IDL.Record({
		currentLiquidity: IDL.Nat,
		currentSqrtPriceX96: IDL.Nat,
		currentTick: IDL.Int,
		txInfo: Transaction__1,
		poolFee: IDL.Nat
	});
	const PushError = IDL.Record({ time: IDL.Int, message: IDL.Text });
	const Result_21 = IDL.Variant({
		ok: IDL.Record({
			infoCid: IDL.Text,
			records: IDL.Vec(SwapRecordInfo),
			errors: IDL.Vec(PushError),
			retryCount: IDL.Nat
		}),
		err: Error
	});
	const Result_20 = IDL.Variant({
		ok: IDL.Vec(IDL.Tuple(IDL.Int, IDL.Nat)),
		err: Error
	});
	const TickLiquidityInfo = IDL.Record({
		tickIndex: IDL.Int,
		price0Decimal: IDL.Nat,
		liquidityNet: IDL.Int,
		price0: IDL.Nat,
		price1: IDL.Nat,
		liquidityGross: IDL.Nat,
		price1Decimal: IDL.Nat
	});
	const Page_3 = IDL.Record({
		content: IDL.Vec(TickLiquidityInfo),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_19 = IDL.Variant({ ok: Page_3, err: Error });
	const TickInfoWithId = IDL.Record({
		id: IDL.Text,
		initialized: IDL.Bool,
		feeGrowthOutside1X128: IDL.Nat,
		secondsPerLiquidityOutsideX128: IDL.Nat,
		liquidityNet: IDL.Int,
		secondsOutside: IDL.Nat,
		liquidityGross: IDL.Nat,
		feeGrowthOutside0X128: IDL.Nat,
		tickCumulativeOutside: IDL.Int
	});
	const Page_2 = IDL.Record({
		content: IDL.Vec(TickInfoWithId),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_18 = IDL.Variant({ ok: Page_2, err: Error });
	const Result_17 = IDL.Variant({
		ok: IDL.Record({
			swapFee0Repurchase: IDL.Nat,
			token0Amount: IDL.Nat,
			swapFeeReceiver: IDL.Text,
			token1Amount: IDL.Nat,
			swapFee1Repurchase: IDL.Nat
		}),
		err: Error
	});
	const Result_1 = IDL.Variant({ ok: IDL.Text, err: Error });
	const Result_15 = IDL.Variant({
		ok: IDL.Record({
			upperLimitOrdersIds: IDL.Vec(IDL.Record({ userPositionId: IDL.Nat, timestamp: IDL.Nat })),
			lowerLimitOrderIds: IDL.Vec(IDL.Record({ userPositionId: IDL.Nat, timestamp: IDL.Nat }))
		}),
		err: Error
	});
	const UserPositionInfo = IDL.Record({
		tickUpper: IDL.Int,
		tokensOwed0: IDL.Nat,
		tokensOwed1: IDL.Nat,
		feeGrowthInside1LastX128: IDL.Nat,
		liquidity: IDL.Nat,
		feeGrowthInside0LastX128: IDL.Nat,
		tickLower: IDL.Int
	});
	const Result_14 = IDL.Variant({ ok: UserPositionInfo, err: Error });
	const Result_13 = IDL.Variant({
		ok: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat))),
		err: Error
	});
	const Result_12 = IDL.Variant({ ok: IDL.Vec(IDL.Nat), err: Error });
	const UserPositionInfoWithTokenAmount = IDL.Record({
		id: IDL.Nat,
		tickUpper: IDL.Int,
		tokensOwed0: IDL.Nat,
		tokensOwed1: IDL.Nat,
		feeGrowthInside1LastX128: IDL.Nat,
		liquidity: IDL.Nat,
		feeGrowthInside0LastX128: IDL.Nat,
		token0Amount: IDL.Nat,
		token1Amount: IDL.Nat,
		tickLower: IDL.Int
	});
	const Page_1 = IDL.Record({
		content: IDL.Vec(UserPositionInfoWithTokenAmount),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_11 = IDL.Variant({ ok: Page_1, err: Error });
	const UserPositionInfoWithId = IDL.Record({
		id: IDL.Nat,
		tickUpper: IDL.Int,
		tokensOwed0: IDL.Nat,
		tokensOwed1: IDL.Nat,
		feeGrowthInside1LastX128: IDL.Nat,
		liquidity: IDL.Nat,
		feeGrowthInside0LastX128: IDL.Nat,
		tickLower: IDL.Int
	});
	const Page = IDL.Record({
		content: IDL.Vec(UserPositionInfoWithId),
		offset: IDL.Nat,
		limit: IDL.Nat,
		totalElements: IDL.Nat
	});
	const Result_10 = IDL.Variant({ ok: Page, err: Error });
	const Result_9 = IDL.Variant({
		ok: IDL.Vec(UserPositionInfoWithId),
		err: Error
	});
	const Result_8 = IDL.Variant({
		ok: IDL.Record({ balance0: IDL.Nat, balance1: IDL.Nat }),
		err: Error
	});
	const Icrc21ConsentMessageMetadata = IDL.Record({
		utc_offset_minutes: IDL.Opt(IDL.Int16),
		language: IDL.Text
	});
	const Icrc21ConsentMessageSpec = IDL.Record({
		metadata: Icrc21ConsentMessageMetadata,
		device_spec: IDL.Opt(
			IDL.Variant({
				GenericDisplay: IDL.Null,
				LineDisplay: IDL.Record({
					characters_per_line: IDL.Nat16,
					lines_per_page: IDL.Nat16
				})
			})
		)
	});
	const Icrc21ConsentMessageRequest = IDL.Record({
		arg: IDL.Vec(IDL.Nat8),
		method: IDL.Text,
		user_preferences: Icrc21ConsentMessageSpec
	});
	const Icrc21ConsentMessage = IDL.Variant({
		LineDisplayMessage: IDL.Record({
			pages: IDL.Vec(IDL.Record({ lines: IDL.Vec(IDL.Text) }))
		}),
		GenericDisplayMessage: IDL.Text
	});
	const Icrc21ConsentInfo = IDL.Record({
		metadata: Icrc21ConsentMessageMetadata,
		consent_message: Icrc21ConsentMessage
	});
	const Icrc21ErrorInfo = IDL.Record({ description: IDL.Text });
	const Icrc21Error = IDL.Variant({
		GenericError: IDL.Record({
			description: IDL.Text,
			error_code: IDL.Nat
		}),
		InsufficientPayment: Icrc21ErrorInfo,
		UnsupportedCanisterCall: Icrc21ErrorInfo,
		ConsentMessageUnavailable: Icrc21ErrorInfo
	});
	const Icrc21ConsentMessageResponse = IDL.Variant({
		Ok: Icrc21ConsentInfo,
		Err: Icrc21Error
	});
	const Icrc28TrustedOriginsResponse = IDL.Record({
		trusted_origins: IDL.Vec(IDL.Text)
	});
	const IncreaseLiquidityArgs = IDL.Record({
		positionId: IDL.Nat,
		amount0Desired: IDL.Text,
		amount1Desired: IDL.Text
	});
	const PoolMetadata = IDL.Record({
		fee: IDL.Nat,
		key: IDL.Text,
		sqrtPriceX96: IDL.Nat,
		tick: IDL.Int,
		liquidity: IDL.Nat,
		token0: Token,
		token1: Token,
		maxLiquidityPerTick: IDL.Nat,
		nextPositionId: IDL.Nat
	});
	const Result_7 = IDL.Variant({ ok: PoolMetadata, err: Error });
	const MintArgs = IDL.Record({
		fee: IDL.Nat,
		tickUpper: IDL.Int,
		token0: IDL.Text,
		token1: IDL.Text,
		amount0Desired: IDL.Text,
		amount1Desired: IDL.Text,
		tickLower: IDL.Int
	});
	const SwapArgs = IDL.Record({
		amountIn: IDL.Text,
		zeroForOne: IDL.Bool,
		amountOutMinimum: IDL.Text
	});
	const Result_6 = IDL.Variant({
		ok: IDL.Record({ tokensOwed0: IDL.Nat, tokensOwed1: IDL.Nat }),
		err: Error
	});
	const Result_5 = IDL.Variant({ ok: IDL.Bool, err: IDL.Null });
	const Result_4 = IDL.Variant({ ok: IDL.Null, err: Error });
	const Result_3 = IDL.Variant({ ok: IDL.Int, err: Error });
	const WithdrawArgs = IDL.Record({
		fee: IDL.Nat,
		token: IDL.Text,
		amount: IDL.Nat
	});
	const WithdrawToSubaccountArgs = IDL.Record({
		fee: IDL.Nat,
		token: IDL.Text,
		subaccount: IDL.Vec(IDL.Nat8),
		amount: IDL.Nat
	});
	const SwapPool = IDL.Service({
		activeJobs: IDL.Func([], [], []),
		addLimitOrder: IDL.Func([LimitOrderArgs], [Result_2], []),
		allTokenBalance: IDL.Func([IDL.Nat, IDL.Nat], [Result_32], ['query']),
		approvePosition: IDL.Func([IDL.Principal, IDL.Nat], [Result_2], []),
		batchRefreshIncome: IDL.Func([IDL.Vec(IDL.Nat)], [Result_31], ['query']),
		checkOwnerOfUserPosition: IDL.Func([IDL.Principal, IDL.Nat], [Result_2], ['query']),
		claim: IDL.Func([ClaimArgs], [Result_30], []),
		decreaseLiquidity: IDL.Func([DecreaseLiquidityArgs], [Result_30], []),
		deleteFailedTransaction: IDL.Func([IDL.Nat, IDL.Bool], [Result_2], []),
		deposit: IDL.Func([DepositArgs], [Result], []),
		depositAllAndMint: IDL.Func([DepositAndMintArgs], [Result], []),
		depositAndSwap: IDL.Func([DepositAndSwapArgs], [Result], []),
		depositFrom: IDL.Func([DepositArgs], [Result], []),
		depositFromAndSwap: IDL.Func([DepositAndSwapArgs], [Result], []),
		getAdmins: IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
		getAvailabilityState: IDL.Func(
			[],
			[
				IDL.Record({
					whiteList: IDL.Vec(IDL.Principal),
					available: IDL.Bool
				})
			],
			['query']
		),
		getCachedTokenFee: IDL.Func(
			[],
			[IDL.Record({ token0Fee: IDL.Nat, token1Fee: IDL.Nat })],
			['query']
		),
		getClaimLog: IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
		getCycleInfo: IDL.Func([], [Result_29], []),
		getFailedTransactions: IDL.Func([], [Result_16], ['query']),
		getFeeGrowthGlobal: IDL.Func([], [Result_28], ['query']),
		getInitArgs: IDL.Func([], [Result_27], ['query']),
		getJobs: IDL.Func([], [IDL.Record({ jobs: IDL.Vec(JobInfo), level: Level })], ['query']),
		getLimitOrderAvailabilityState: IDL.Func([], [Result_2], ['query']),
		getLimitOrderStack: IDL.Func([], [Result_26], ['query']),
		getLimitOrders: IDL.Func([], [Result_25], ['query']),
		getMistransferBalance: IDL.Func([Token], [Result], []),
		getPosition: IDL.Func([GetPositionArgs], [Result_24], ['query']),
		getPositions: IDL.Func([IDL.Nat, IDL.Nat], [Result_23], ['query']),
		getSortedUserLimitOrders: IDL.Func([IDL.Principal], [Result_22], ['query']),
		getSwapRecordState: IDL.Func([], [Result_21], ['query']),
		getTickBitmaps: IDL.Func([], [Result_20], ['query']),
		getTickInfos: IDL.Func([IDL.Nat, IDL.Nat], [Result_19], ['query']),
		getTicks: IDL.Func([IDL.Nat, IDL.Nat], [Result_18], ['query']),
		getTokenAmountState: IDL.Func([], [Result_17], ['query']),
		getTokenBalance: IDL.Func([], [IDL.Record({ token0: IDL.Nat, token1: IDL.Nat })], []),
		getTransactions: IDL.Func([], [Result_16], ['query']),
		getTransactionsByOwner: IDL.Func([IDL.Principal], [Result_16], ['query']),
		getUserByPositionId: IDL.Func([IDL.Nat], [Result_1], ['query']),
		getUserLimitOrders: IDL.Func([IDL.Principal], [Result_15], ['query']),
		getUserPosition: IDL.Func([IDL.Nat], [Result_14], ['query']),
		getUserPositionIds: IDL.Func([], [Result_13], ['query']),
		getUserPositionIdsByPrincipal: IDL.Func([IDL.Principal], [Result_12], ['query']),
		getUserPositionWithTokenAmount: IDL.Func([IDL.Nat, IDL.Nat], [Result_11], ['query']),
		getUserPositions: IDL.Func([IDL.Nat, IDL.Nat], [Result_10], ['query']),
		getUserPositionsByPrincipal: IDL.Func([IDL.Principal], [Result_9], ['query']),
		getUserUnusedBalance: IDL.Func([IDL.Principal], [Result_8], ['query']),
		getVersion: IDL.Func([], [IDL.Text], ['query']),
		icrc10_supported_standards: IDL.Func(
			[],
			[IDL.Vec(IDL.Record({ url: IDL.Text, name: IDL.Text }))],
			['query']
		),
		icrc21_canister_call_consent_message: IDL.Func(
			[Icrc21ConsentMessageRequest],
			[Icrc21ConsentMessageResponse],
			[]
		),
		icrc28_trusted_origins: IDL.Func([], [Icrc28TrustedOriginsResponse], []),
		increaseLiquidity: IDL.Func([IncreaseLiquidityArgs], [Result], []),
		init: IDL.Func([IDL.Nat, IDL.Int, IDL.Nat], [], []),
		metadata: IDL.Func([], [Result_7], ['query']),
		mint: IDL.Func([MintArgs], [Result], []),
		quote: IDL.Func([SwapArgs], [Result], ['query']),
		quoteForAll: IDL.Func([SwapArgs], [Result], ['query']),
		refreshIncome: IDL.Func([IDL.Nat], [Result_6], ['query']),
		removeLimitOrder: IDL.Func([IDL.Nat], [Result_2], []),
		restartJobs: IDL.Func([IDL.Vec(IDL.Text)], [], []),
		setAdmins: IDL.Func([IDL.Vec(IDL.Principal)], [], []),
		setAvailable: IDL.Func([IDL.Bool], [], []),
		setIcrc28TrustedOrigins: IDL.Func([IDL.Vec(IDL.Text)], [Result_5], []),
		setLimitOrderAvailable: IDL.Func([IDL.Bool], [], []),
		setTokenAmountState: IDL.Func([IDL.Nat, IDL.Nat], [Result_4], []),
		setWhiteList: IDL.Func([IDL.Vec(IDL.Principal)], [], []),
		stopJobs: IDL.Func([IDL.Vec(IDL.Text)], [], []),
		sumTick: IDL.Func([], [Result_3], ['query']),
		swap: IDL.Func([SwapArgs], [Result], []),
		transferPosition: IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [Result_2], []),
		updateTokenFee: IDL.Func([], [], []),
		upgradeTokenStandard: IDL.Func([IDL.Principal], [Result_1], []),
		withdraw: IDL.Func([WithdrawArgs], [Result], []),
		withdrawMistransferBalance: IDL.Func([Token], [Result], []),
		withdrawToSubaccount: IDL.Func([WithdrawToSubaccountArgs], [Result], [])
	});
	return SwapPool;
};
// @ts-ignore
export const init = ({ IDL }) => {
	const Token = IDL.Record({ address: IDL.Text, standard: IDL.Text });
	return [Token, Token, IDL.Principal, IDL.Principal, IDL.Principal, IDL.Principal];
};
