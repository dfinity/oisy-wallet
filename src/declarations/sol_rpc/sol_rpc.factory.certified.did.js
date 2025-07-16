// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const Regex = IDL.Text;
	const LogFilter = IDL.Variant({
		ShowAll: IDL.Null,
		HideAll: IDL.Null,
		ShowPattern: Regex,
		HidePattern: Regex
	});
	const Mode = IDL.Variant({ Demo: IDL.Null, Normal: IDL.Null });
	const RegexSubstitution = IDL.Record({
		pattern: Regex,
		replacement: IDL.Text
	});
	const OverrideProvider = IDL.Record({
		overrideUrl: IDL.Opt(RegexSubstitution)
	});
	const NumSubnetNodes = IDL.Nat32;
	const InstallArgs = IDL.Record({
		logFilter: IDL.Opt(LogFilter),
		manageApiKeys: IDL.Opt(IDL.Vec(IDL.Principal)),
		mode: IDL.Opt(Mode),
		overrideProvider: IDL.Opt(OverrideProvider),
		numSubnetNodes: IDL.Opt(NumSubnetNodes)
	});
	const SolanaCluster = IDL.Variant({
		Mainnet: IDL.Null,
		Testnet: IDL.Null,
		Devnet: IDL.Null
	});
	const HttpHeader = IDL.Record({ value: IDL.Text, name: IDL.Text });
	const RpcEndpoint = IDL.Record({
		url: IDL.Text,
		headers: IDL.Opt(IDL.Vec(HttpHeader))
	});
	const SupportedProvider = IDL.Variant({
		AnkrMainnet: IDL.Null,
		AlchemyDevnet: IDL.Null,
		DrpcMainnet: IDL.Null,
		ChainstackDevnet: IDL.Null,
		AlchemyMainnet: IDL.Null,
		HeliusDevnet: IDL.Null,
		AnkrDevnet: IDL.Null,
		DrpcDevnet: IDL.Null,
		ChainstackMainnet: IDL.Null,
		PublicNodeMainnet: IDL.Null,
		HeliusMainnet: IDL.Null
	});
	const RpcSource = IDL.Variant({
		Custom: RpcEndpoint,
		Supported: SupportedProvider
	});
	const RpcSources = IDL.Variant({
		Default: SolanaCluster,
		Custom: IDL.Vec(RpcSource)
	});
	const ConsensusStrategy = IDL.Variant({
		Equality: IDL.Null,
		Threshold: IDL.Record({ min: IDL.Nat8, total: IDL.Opt(IDL.Nat8) })
	});
	const RpcConfig = IDL.Record({
		responseConsensus: IDL.Opt(ConsensusStrategy),
		responseSizeEstimate: IDL.Opt(IDL.Nat64)
	});
	const GetAccountInfoEncoding = IDL.Variant({
		'base64+zstd': IDL.Null,
		jsonParsed: IDL.Null,
		base58: IDL.Null,
		base64: IDL.Null
	});
	const Pubkey = IDL.Text;
	const DataSlice = IDL.Record({ offset: IDL.Nat32, length: IDL.Nat32 });
	const Slot = IDL.Nat64;
	const CommitmentLevel = IDL.Variant({
		finalized: IDL.Null,
		confirmed: IDL.Null,
		processed: IDL.Null
	});
	const GetAccountInfoParams = IDL.Record({
		encoding: IDL.Opt(GetAccountInfoEncoding),
		pubkey: Pubkey,
		dataSlice: IDL.Opt(DataSlice),
		minContextSlot: IDL.Opt(Slot),
		commitment: IDL.Opt(CommitmentLevel)
	});
	const ParsedAccount = IDL.Record({
		space: IDL.Nat64,
		parsed: IDL.Text,
		program: Pubkey
	});
	const AccountEncoding = IDL.Variant({
		'base64+zstd': IDL.Null,
		jsonParsed: IDL.Null,
		base58: IDL.Null,
		base64: IDL.Null,
		binary: IDL.Null
	});
	const AccountData = IDL.Variant({
		json: ParsedAccount,
		legacyBinary: IDL.Text,
		binary: IDL.Tuple(IDL.Text, AccountEncoding)
	});
	const AccountInfo = IDL.Record({
		executable: IDL.Bool,
		owner: Pubkey,
		lamports: IDL.Nat64,
		data: AccountData,
		space: IDL.Nat64,
		rentEpoch: IDL.Nat64
	});
	const JsonRpcError = IDL.Record({ code: IDL.Int64, message: IDL.Text });
	const ProviderError = IDL.Variant({
		TooFewCycles: IDL.Record({ expected: IDL.Nat, received: IDL.Nat }),
		InvalidRpcConfig: IDL.Text,
		UnsupportedCluster: IDL.Text
	});
	const RejectionCode = IDL.Variant({
		NoError: IDL.Null,
		CanisterError: IDL.Null,
		SysTransient: IDL.Null,
		DestinationInvalid: IDL.Null,
		Unknown: IDL.Null,
		SysFatal: IDL.Null,
		CanisterReject: IDL.Null
	});
	const HttpOutcallError = IDL.Variant({
		IcError: IDL.Record({ code: RejectionCode, message: IDL.Text }),
		InvalidHttpJsonRpcResponse: IDL.Record({
			status: IDL.Nat16,
			body: IDL.Text,
			parsingError: IDL.Opt(IDL.Text)
		})
	});
	const RpcError = IDL.Variant({
		JsonRpcError: JsonRpcError,
		ProviderError: ProviderError,
		ValidationError: IDL.Text,
		HttpOutcallError: HttpOutcallError
	});
	const GetAccountInfoResult = IDL.Variant({
		Ok: IDL.Opt(AccountInfo),
		Err: RpcError
	});
	const MultiGetAccountInfoResult = IDL.Variant({
		Consistent: GetAccountInfoResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetAccountInfoResult))
	});
	const RequestCostResult = IDL.Variant({ Ok: IDL.Nat, Err: RpcError });
	const GetBalanceParams = IDL.Record({
		pubkey: Pubkey,
		minContextSlot: IDL.Opt(Slot),
		commitment: IDL.Opt(CommitmentLevel)
	});
	const Lamport = IDL.Nat64;
	const GetBalanceResult = IDL.Variant({ Ok: Lamport, Err: RpcError });
	const MultiGetBalanceResult = IDL.Variant({
		Consistent: GetBalanceResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetBalanceResult))
	});
	const TransactionDetails = IDL.Variant({
		none: IDL.Null,
		accounts: IDL.Null,
		signatures: IDL.Null
	});
	const GetBlockParams = IDL.Record({
		maxSupportedTransactionVersion: IDL.Opt(IDL.Nat8),
		transactionDetails: IDL.Opt(TransactionDetails),
		slot: Slot,
		rewards: IDL.Opt(IDL.Bool),
		commitment: IDL.Opt(IDL.Variant({ finalized: IDL.Null, confirmed: IDL.Null }))
	});
	const Timestamp = IDL.Int64;
	const Hash = IDL.Text;
	const Signature = IDL.Text;
	const Reward = IDL.Record({
		lamports: IDL.Int64,
		postBalance: IDL.Nat64,
		commission: IDL.Opt(IDL.Nat8),
		pubkey: Pubkey,
		rewardType: IDL.Opt(
			IDL.Variant({
				fee: IDL.Null,
				staking: IDL.Null,
				rent: IDL.Null,
				voting: IDL.Null
			})
		)
	});
	const InstructionError = IDL.Variant({
		ModifiedProgramId: IDL.Null,
		CallDepth: IDL.Null,
		Immutable: IDL.Null,
		GenericError: IDL.Null,
		ExecutableAccountNotRentExempt: IDL.Null,
		IncorrectAuthority: IDL.Null,
		PrivilegeEscalation: IDL.Null,
		ReentrancyNotAllowed: IDL.Null,
		InvalidInstructionData: IDL.Null,
		RentEpochModified: IDL.Null,
		IllegalOwner: IDL.Null,
		ComputationalBudgetExceeded: IDL.Null,
		ExecutableDataModified: IDL.Null,
		ExecutableLamportChange: IDL.Null,
		UnbalancedInstruction: IDL.Null,
		ProgramEnvironmentSetupFailure: IDL.Null,
		IncorrectProgramId: IDL.Null,
		UnsupportedSysvar: IDL.Null,
		UnsupportedProgramId: IDL.Null,
		AccountDataTooSmall: IDL.Null,
		NotEnoughAccountKeys: IDL.Null,
		AccountBorrowFailed: IDL.Null,
		InvalidRealloc: IDL.Null,
		AccountNotExecutable: IDL.Null,
		AccountNotRentExempt: IDL.Null,
		Custom: IDL.Nat32,
		AccountDataSizeChanged: IDL.Null,
		MaxAccountsDataAllocationsExceeded: IDL.Null,
		ExternalAccountLamportSpend: IDL.Null,
		ExternalAccountDataModified: IDL.Null,
		MissingAccount: IDL.Null,
		ProgramFailedToComplete: IDL.Null,
		MaxInstructionTraceLengthExceeded: IDL.Null,
		InvalidAccountData: IDL.Null,
		ProgramFailedToCompile: IDL.Null,
		ExecutableModified: IDL.Null,
		InvalidAccountOwner: IDL.Null,
		MaxSeedLengthExceeded: IDL.Null,
		AccountAlreadyInitialized: IDL.Null,
		AccountBorrowOutstanding: IDL.Null,
		ReadonlyDataModified: IDL.Null,
		UninitializedAccount: IDL.Null,
		InvalidArgument: IDL.Null,
		BorshIoError: IDL.Text,
		BuiltinProgramsMustConsumeComputeUnits: IDL.Null,
		MissingRequiredSignature: IDL.Null,
		DuplicateAccountOutOfSync: IDL.Null,
		MaxAccountsExceeded: IDL.Null,
		ArithmeticOverflow: IDL.Null,
		InvalidError: IDL.Null,
		InvalidSeeds: IDL.Null,
		DuplicateAccountIndex: IDL.Null,
		ReadonlyLamportChange: IDL.Null,
		InsufficientFunds: IDL.Null
	});
	const TransactionError = IDL.Variant({
		ProgramCacheHitMaxLimit: IDL.Null,
		InvalidAccountForFee: IDL.Null,
		AddressLookupTableNotFound: IDL.Null,
		MissingSignatureForFee: IDL.Null,
		WouldExceedAccountDataBlockLimit: IDL.Null,
		AccountInUse: IDL.Null,
		DuplicateInstruction: IDL.Nat8,
		AccountNotFound: IDL.Null,
		TooManyAccountLocks: IDL.Null,
		InvalidAccountIndex: IDL.Null,
		AlreadyProcessed: IDL.Null,
		WouldExceedAccountDataTotalLimit: IDL.Null,
		InvalidAddressLookupTableIndex: IDL.Null,
		SanitizeFailure: IDL.Null,
		ResanitizationNeeded: IDL.Null,
		InvalidRentPayingAccount: IDL.Null,
		MaxLoadedAccountsDataSizeExceeded: IDL.Null,
		InvalidAddressLookupTableData: IDL.Null,
		InvalidWritableAccount: IDL.Null,
		WouldExceedMaxAccountCostLimit: IDL.Null,
		InvalidLoadedAccountsDataSizeLimit: IDL.Null,
		InvalidProgramForExecution: IDL.Null,
		InstructionError: IDL.Tuple(IDL.Nat8, InstructionError),
		InsufficientFundsForRent: IDL.Record({ account_index: IDL.Nat8 }),
		UnsupportedVersion: IDL.Null,
		ClusterMaintenance: IDL.Null,
		WouldExceedMaxVoteCostLimit: IDL.Null,
		SignatureFailure: IDL.Null,
		ProgramAccountNotFound: IDL.Null,
		AccountLoadedTwice: IDL.Null,
		ProgramExecutionTemporarilyRestricted: IDL.Record({
			account_index: IDL.Nat8
		}),
		AccountBorrowOutstanding: IDL.Null,
		WouldExceedMaxBlockCostLimit: IDL.Null,
		InvalidAddressLookupTableOwner: IDL.Null,
		InsufficientFundsForFee: IDL.Null,
		CallChainTooDeep: IDL.Null,
		UnbalancedTransaction: IDL.Null,
		CommitCancelled: IDL.Null,
		BlockhashNotFound: IDL.Null
	});
	const TokenAmount = IDL.Record({
		decimals: IDL.Nat8,
		uiAmount: IDL.Opt(IDL.Float64),
		uiAmountString: IDL.Text,
		amount: IDL.Text
	});
	const TransactionTokenBalance = IDL.Record({
		uiTokenAmount: TokenAmount,
		owner: IDL.Opt(Pubkey),
		accountIndex: IDL.Nat8,
		mint: IDL.Text,
		programId: IDL.Opt(Pubkey)
	});
	const CompiledInstruction = IDL.Record({
		data: IDL.Text,
		accounts: IDL.Vec(IDL.Nat8),
		programIdIndex: IDL.Nat8,
		stackHeight: IDL.Opt(IDL.Nat32)
	});
	const Instruction = IDL.Variant({ compiled: CompiledInstruction });
	const InnerInstructions = IDL.Record({
		instructions: IDL.Vec(Instruction),
		index: IDL.Nat8
	});
	const LoadedAddresses = IDL.Record({
		writable: IDL.Vec(Pubkey),
		readonly: IDL.Vec(Pubkey)
	});
	const TransactionStatusMeta = IDL.Record({
		fee: IDL.Nat64,
		status: IDL.Variant({ Ok: IDL.Null, Err: TransactionError }),
		preBalances: IDL.Vec(IDL.Nat64),
		postTokenBalances: IDL.Opt(IDL.Vec(TransactionTokenBalance)),
		innerInstructions: IDL.Opt(IDL.Vec(InnerInstructions)),
		postBalances: IDL.Vec(IDL.Nat64),
		loadedAddresses: IDL.Opt(LoadedAddresses),
		rewards: IDL.Opt(IDL.Vec(Reward)),
		logMessages: IDL.Opt(IDL.Vec(IDL.Text)),
		returnData: IDL.Opt(IDL.Record({ data: IDL.Text, programId: Pubkey })),
		preTokenBalances: IDL.Opt(IDL.Vec(TransactionTokenBalance)),
		computeUnitsConsumed: IDL.Opt(IDL.Nat64)
	});
	const EncodedTransaction = IDL.Variant({
		legacyBinary: IDL.Text,
		binary: IDL.Tuple(IDL.Text, IDL.Variant({ base58: IDL.Null, base64: IDL.Null }))
	});
	const EncodedTransactionWithStatusMeta = IDL.Record({
		meta: IDL.Opt(TransactionStatusMeta),
		transaction: EncodedTransaction,
		version: IDL.Opt(IDL.Variant({ legacy: IDL.Null, number: IDL.Nat8 }))
	});
	const ConfirmedBlock = IDL.Record({
		numRewardPartition: IDL.Opt(IDL.Nat64),
		blockTime: IDL.Opt(Timestamp),
		blockhash: Hash,
		blockHeight: IDL.Opt(IDL.Nat64),
		signatures: IDL.Opt(IDL.Vec(Signature)),
		rewards: IDL.Opt(IDL.Vec(Reward)),
		transactions: IDL.Opt(IDL.Vec(EncodedTransactionWithStatusMeta)),
		previousBlockhash: Hash,
		parentSlot: Slot
	});
	const GetBlockResult = IDL.Variant({
		Ok: IDL.Opt(ConfirmedBlock),
		Err: RpcError
	});
	const MultiGetBlockResult = IDL.Variant({
		Consistent: GetBlockResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetBlockResult))
	});
	const RpcAuth = IDL.Variant({
		BearerToken: IDL.Record({ url: IDL.Text }),
		UrlParameter: IDL.Record({ urlPattern: IDL.Text })
	});
	const RpcAccess = IDL.Variant({
		Authenticated: IDL.Record({
			publicUrl: IDL.Opt(IDL.Text),
			auth: RpcAuth
		}),
		Unauthenticated: IDL.Record({ publicUrl: IDL.Text })
	});
	const RpcProvider = IDL.Record({
		access: RpcAccess,
		cluster: SolanaCluster
	});
	const RoundingError = IDL.Nat64;
	const GetRecentPrioritizationFeesRpcConfig = IDL.Record({
		responseConsensus: IDL.Opt(ConsensusStrategy),
		maxSlotRoundingError: IDL.Opt(RoundingError),
		responseSizeEstimate: IDL.Opt(IDL.Nat64),
		maxLength: IDL.Opt(IDL.Nat8)
	});
	const GetRecentPrioritizationFeesParams = IDL.Vec(Pubkey);
	const MicroLamport = IDL.Nat64;
	const PrioritizationFee = IDL.Record({
		prioritizationFee: MicroLamport,
		slot: Slot
	});
	const GetRecentPrioritizationFeesResult = IDL.Variant({
		Ok: IDL.Vec(PrioritizationFee),
		Err: RpcError
	});
	const MultiGetRecentPrioritizationFeesResult = IDL.Variant({
		Consistent: GetRecentPrioritizationFeesResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetRecentPrioritizationFeesResult))
	});
	const GetSignatureStatusesParams = IDL.Record({
		searchTransactionHistory: IDL.Opt(IDL.Bool),
		signatures: IDL.Vec(Signature)
	});
	const TransactionConfirmationStatus = IDL.Variant({
		finalized: IDL.Null,
		confirmed: IDL.Null,
		processed: IDL.Null
	});
	const TransactionStatus = IDL.Record({
		err: IDL.Opt(TransactionError),
		status: IDL.Variant({ Ok: IDL.Null, Err: TransactionError }),
		confirmationStatus: IDL.Opt(TransactionConfirmationStatus),
		slot: Slot
	});
	const GetSignatureStatusesResult = IDL.Variant({
		Ok: IDL.Vec(IDL.Opt(TransactionStatus)),
		Err: RpcError
	});
	const MultiGetSignatureStatusesResult = IDL.Variant({
		Consistent: GetSignatureStatusesResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetSignatureStatusesResult))
	});
	const GetSignaturesForAddressParams = IDL.Record({
		pubkey: Pubkey,
		limit: IDL.Opt(IDL.Nat32),
		before: IDL.Opt(Signature),
		until: IDL.Opt(Signature),
		minContextSlot: IDL.Opt(Slot),
		commitment: IDL.Opt(CommitmentLevel)
	});
	const ConfirmedTransactionStatusWithSignature = IDL.Record({
		err: IDL.Opt(TransactionError),
		signature: Signature,
		confirmationStatus: IDL.Opt(TransactionConfirmationStatus),
		memo: IDL.Opt(IDL.Text),
		slot: Slot,
		blockTime: IDL.Opt(Timestamp)
	});
	const GetSignaturesForAddressResult = IDL.Variant({
		Ok: IDL.Vec(ConfirmedTransactionStatusWithSignature),
		Err: RpcError
	});
	const MultiGetSignaturesForAddressResult = IDL.Variant({
		Consistent: GetSignaturesForAddressResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetSignaturesForAddressResult))
	});
	const GetSlotRpcConfig = IDL.Record({
		roundingError: IDL.Opt(RoundingError),
		responseConsensus: IDL.Opt(ConsensusStrategy),
		responseSizeEstimate: IDL.Opt(IDL.Nat64)
	});
	const GetSlotParams = IDL.Record({
		minContextSlot: IDL.Opt(Slot),
		commitment: IDL.Opt(CommitmentLevel)
	});
	const GetSlotResult = IDL.Variant({ Ok: Slot, Err: RpcError });
	const MultiGetSlotResult = IDL.Variant({
		Consistent: GetSlotResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetSlotResult))
	});
	const GetTokenAccountBalanceParams = IDL.Record({
		pubkey: Pubkey,
		commitment: IDL.Opt(CommitmentLevel)
	});
	const GetTokenAccountBalanceResult = IDL.Variant({
		Ok: TokenAmount,
		Err: RpcError
	});
	const MultiGetTokenAccountBalanceResult = IDL.Variant({
		Consistent: GetTokenAccountBalanceResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetTokenAccountBalanceResult))
	});
	const GetTransactionParams = IDL.Record({
		signature: Signature,
		maxSupportedTransactionVersion: IDL.Opt(IDL.Nat8),
		encoding: IDL.Opt(IDL.Variant({ base58: IDL.Null, base64: IDL.Null })),
		commitment: IDL.Opt(CommitmentLevel)
	});
	const EncodedConfirmedTransactionWithStatusMeta = IDL.Record({
		transaction: EncodedTransactionWithStatusMeta,
		slot: Slot,
		blockTime: IDL.Opt(Timestamp)
	});
	const GetTransactionResult = IDL.Variant({
		Ok: IDL.Opt(EncodedConfirmedTransactionWithStatusMeta),
		Err: RpcError
	});
	const MultiGetTransactionResult = IDL.Variant({
		Consistent: GetTransactionResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, GetTransactionResult))
	});
	const RequestResult = IDL.Variant({ Ok: IDL.Text, Err: RpcError });
	const MultiRequestResult = IDL.Variant({
		Consistent: RequestResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, RequestResult))
	});
	const SendTransactionEncoding = IDL.Variant({
		base58: IDL.Null,
		base64: IDL.Null
	});
	const SendTransactionParams = IDL.Record({
		encoding: IDL.Opt(SendTransactionEncoding),
		preflightCommitment: IDL.Opt(CommitmentLevel),
		transaction: IDL.Text,
		maxRetries: IDL.Opt(IDL.Nat32),
		minContextSlot: IDL.Opt(Slot),
		skipPreflight: IDL.Opt(IDL.Bool)
	});
	const SendTransactionResult = IDL.Variant({
		Ok: Signature,
		Err: RpcError
	});
	const MultiSendTransactionResult = IDL.Variant({
		Consistent: SendTransactionResult,
		Inconsistent: IDL.Vec(IDL.Tuple(RpcSource, SendTransactionResult))
	});
	return IDL.Service({
		getAccountInfo: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetAccountInfoParams],
			[MultiGetAccountInfoResult],
			[]
		),
		getAccountInfoCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetAccountInfoParams],
			[RequestCostResult]
		),
		getBalance: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetBalanceParams],
			[MultiGetBalanceResult],
			[]
		),
		getBalanceCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetBalanceParams],
			[RequestCostResult]
		),
		getBlock: IDL.Func([RpcSources, IDL.Opt(RpcConfig), GetBlockParams], [MultiGetBlockResult], []),
		getBlockCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetBlockParams],
			[RequestCostResult]
		),
		getProviders: IDL.Func([], [IDL.Vec(IDL.Tuple(SupportedProvider, RpcProvider))]),
		getRecentPrioritizationFees: IDL.Func(
			[
				RpcSources,
				IDL.Opt(GetRecentPrioritizationFeesRpcConfig),
				IDL.Opt(GetRecentPrioritizationFeesParams)
			],
			[MultiGetRecentPrioritizationFeesResult],
			[]
		),
		getRecentPrioritizationFeesCyclesCost: IDL.Func(
			[
				RpcSources,
				IDL.Opt(GetRecentPrioritizationFeesRpcConfig),
				IDL.Opt(GetRecentPrioritizationFeesParams)
			],
			[RequestCostResult]
		),
		getSignatureStatuses: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetSignatureStatusesParams],
			[MultiGetSignatureStatusesResult],
			[]
		),
		getSignatureStatusesCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetSignatureStatusesParams],
			[RequestCostResult]
		),
		getSignaturesForAddress: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetSignaturesForAddressParams],
			[MultiGetSignaturesForAddressResult],
			[]
		),
		getSignaturesForAddressCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetSignaturesForAddressParams],
			[RequestCostResult]
		),
		getSlot: IDL.Func(
			[RpcSources, IDL.Opt(GetSlotRpcConfig), IDL.Opt(GetSlotParams)],
			[MultiGetSlotResult],
			[]
		),
		getSlotCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(GetSlotRpcConfig), IDL.Opt(GetSlotParams)],
			[RequestCostResult]
		),
		getTokenAccountBalance: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetTokenAccountBalanceParams],
			[MultiGetTokenAccountBalanceResult],
			[]
		),
		getTokenAccountBalanceCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetTokenAccountBalanceParams],
			[RequestCostResult]
		),
		getTransaction: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetTransactionParams],
			[MultiGetTransactionResult],
			[]
		),
		getTransactionCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), GetTransactionParams],
			[RequestCostResult]
		),
		jsonRequest: IDL.Func([RpcSources, IDL.Opt(RpcConfig), IDL.Text], [MultiRequestResult], []),
		jsonRequestCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), IDL.Text],
			[RequestCostResult]
		),
		sendTransaction: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), SendTransactionParams],
			[MultiSendTransactionResult],
			[]
		),
		sendTransactionCyclesCost: IDL.Func(
			[RpcSources, IDL.Opt(RpcConfig), SendTransactionParams],
			[RequestCostResult]
		),
		updateApiKeys: IDL.Func([IDL.Vec(IDL.Tuple(SupportedProvider, IDL.Opt(IDL.Text)))], [], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const Regex = IDL.Text;
	const LogFilter = IDL.Variant({
		ShowAll: IDL.Null,
		HideAll: IDL.Null,
		ShowPattern: Regex,
		HidePattern: Regex
	});
	const Mode = IDL.Variant({ Demo: IDL.Null, Normal: IDL.Null });
	const RegexSubstitution = IDL.Record({
		pattern: Regex,
		replacement: IDL.Text
	});
	const OverrideProvider = IDL.Record({
		overrideUrl: IDL.Opt(RegexSubstitution)
	});
	const NumSubnetNodes = IDL.Nat32;
	const InstallArgs = IDL.Record({
		logFilter: IDL.Opt(LogFilter),
		manageApiKeys: IDL.Opt(IDL.Vec(IDL.Principal)),
		mode: IDL.Opt(Mode),
		overrideProvider: IDL.Opt(OverrideProvider),
		numSubnetNodes: IDL.Opt(NumSubnetNodes)
	});
	return [InstallArgs];
};
