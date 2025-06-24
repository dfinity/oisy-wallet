import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export type AccountData =
	| { json: ParsedAccount }
	| { legacyBinary: string }
	| { binary: [string, AccountEncoding] };
export type AccountEncoding =
	| { 'base64+zstd': null }
	| { jsonParsed: null }
	| { base58: null }
	| { base64: null }
	| { binary: null };
export interface AccountInfo {
	executable: boolean;
	owner: Pubkey;
	lamports: bigint;
	data: AccountData;
	space: bigint;
	rentEpoch: bigint;
}
export type CommitmentLevel = { finalized: null } | { confirmed: null } | { processed: null };
export interface CompiledInstruction {
	data: string;
	accounts: Uint8Array | number[];
	programIdIndex: number;
	stackHeight: [] | [number];
}
export interface ConfirmedBlock {
	numRewardPartition: [] | [bigint];
	blockTime: [] | [Timestamp];
	blockhash: Hash;
	blockHeight: [] | [bigint];
	signatures: [] | [Array<Signature>];
	rewards: [] | [Array<Reward>];
	transactions: [] | [Array<EncodedTransactionWithStatusMeta>];
	previousBlockhash: Hash;
	parentSlot: Slot;
}
export interface ConfirmedTransactionStatusWithSignature {
	err: [] | [TransactionError];
	signature: Signature;
	confirmationStatus: [] | [TransactionConfirmationStatus];
	memo: [] | [string];
	slot: Slot;
	blockTime: [] | [Timestamp];
}
export type ConsensusStrategy =
	| { Equality: null }
	| { Threshold: { min: number; total: [] | [number] } };
export interface DataSlice {
	offset: number;
	length: number;
}
export interface EncodedConfirmedTransactionWithStatusMeta {
	transaction: EncodedTransactionWithStatusMeta;
	slot: Slot;
	blockTime: [] | [Timestamp];
}
export type EncodedTransaction =
	| { legacyBinary: string }
	| { binary: [string, { base58: null } | { base64: null }] };
export interface EncodedTransactionWithStatusMeta {
	meta: [] | [TransactionStatusMeta];
	transaction: EncodedTransaction;
	version: [] | [{ legacy: null } | { number: number }];
}
export type GetAccountInfoEncoding =
	| { 'base64+zstd': null }
	| { jsonParsed: null }
	| { base58: null }
	| { base64: null };
export interface GetAccountInfoParams {
	encoding: [] | [GetAccountInfoEncoding];
	pubkey: Pubkey;
	dataSlice: [] | [DataSlice];
	minContextSlot: [] | [Slot];
	commitment: [] | [CommitmentLevel];
}
export type GetAccountInfoResult = { Ok: [] | [AccountInfo] } | { Err: RpcError };
export interface GetBalanceParams {
	pubkey: Pubkey;
	minContextSlot: [] | [Slot];
	commitment: [] | [CommitmentLevel];
}
export type GetBalanceResult = { Ok: Lamport } | { Err: RpcError };
export interface GetBlockParams {
	maxSupportedTransactionVersion: [] | [number];
	transactionDetails: [] | [TransactionDetails];
	slot: Slot;
	rewards: [] | [boolean];
	commitment: [] | [{ finalized: null } | { confirmed: null }];
}
export type GetBlockResult = { Ok: [] | [ConfirmedBlock] } | { Err: RpcError };
export type GetRecentPrioritizationFeesParams = Array<Pubkey>;
export type GetRecentPrioritizationFeesResult =
	| {
			Ok: Array<PrioritizationFee>;
	  }
	| { Err: RpcError };
export interface GetRecentPrioritizationFeesRpcConfig {
	responseConsensus: [] | [ConsensusStrategy];
	maxSlotRoundingError: [] | [RoundingError];
	responseSizeEstimate: [] | [bigint];
	maxLength: [] | [number];
}
export interface GetSignatureStatusesParams {
	searchTransactionHistory: [] | [boolean];
	signatures: Array<Signature>;
}
export type GetSignatureStatusesResult =
	| {
			Ok: Array<[] | [TransactionStatus]>;
	  }
	| { Err: RpcError };
export interface GetSignaturesForAddressParams {
	pubkey: Pubkey;
	limit: [] | [number];
	before: [] | [Signature];
	until: [] | [Signature];
	minContextSlot: [] | [Slot];
	commitment: [] | [CommitmentLevel];
}
export type GetSignaturesForAddressResult =
	| {
			Ok: Array<ConfirmedTransactionStatusWithSignature>;
	  }
	| { Err: RpcError };
export interface GetSlotParams {
	minContextSlot: [] | [Slot];
	commitment: [] | [CommitmentLevel];
}
export type GetSlotResult = { Ok: Slot } | { Err: RpcError };
export interface GetSlotRpcConfig {
	roundingError: [] | [RoundingError];
	responseConsensus: [] | [ConsensusStrategy];
	responseSizeEstimate: [] | [bigint];
}
export interface GetTokenAccountBalanceParams {
	pubkey: Pubkey;
	commitment: [] | [CommitmentLevel];
}
export type GetTokenAccountBalanceResult = { Ok: TokenAmount } | { Err: RpcError };
export interface GetTransactionParams {
	signature: Signature;
	maxSupportedTransactionVersion: [] | [number];
	encoding: [] | [{ base58: null } | { base64: null }];
	commitment: [] | [CommitmentLevel];
}
export type GetTransactionResult =
	| {
			Ok: [] | [EncodedConfirmedTransactionWithStatusMeta];
	  }
	| { Err: RpcError };
export type Hash = string;
export interface HttpHeader {
	value: string;
	name: string;
}
export type HttpOutcallError =
	| {
			IcError: { code: RejectionCode; message: string };
	  }
	| {
			InvalidHttpJsonRpcResponse: {
				status: number;
				body: string;
				parsingError: [] | [string];
			};
	  };
export interface InnerInstructions {
	instructions: Array<Instruction>;
	index: number;
}
export interface InstallArgs {
	logFilter: [] | [LogFilter];
	manageApiKeys: [] | [Array<Principal>];
	mode: [] | [Mode];
	overrideProvider: [] | [OverrideProvider];
	numSubnetNodes: [] | [NumSubnetNodes];
}
export type Instruction = { compiled: CompiledInstruction };
export type InstructionError =
	| { ModifiedProgramId: null }
	| { CallDepth: null }
	| { Immutable: null }
	| { GenericError: null }
	| { ExecutableAccountNotRentExempt: null }
	| { IncorrectAuthority: null }
	| { PrivilegeEscalation: null }
	| { ReentrancyNotAllowed: null }
	| { InvalidInstructionData: null }
	| { RentEpochModified: null }
	| { IllegalOwner: null }
	| { ComputationalBudgetExceeded: null }
	| { ExecutableDataModified: null }
	| { ExecutableLamportChange: null }
	| { UnbalancedInstruction: null }
	| { ProgramEnvironmentSetupFailure: null }
	| { IncorrectProgramId: null }
	| { UnsupportedSysvar: null }
	| { UnsupportedProgramId: null }
	| { AccountDataTooSmall: null }
	| { NotEnoughAccountKeys: null }
	| { AccountBorrowFailed: null }
	| { InvalidRealloc: null }
	| { AccountNotExecutable: null }
	| { AccountNotRentExempt: null }
	| { Custom: number }
	| { AccountDataSizeChanged: null }
	| { MaxAccountsDataAllocationsExceeded: null }
	| { ExternalAccountLamportSpend: null }
	| { ExternalAccountDataModified: null }
	| { MissingAccount: null }
	| { ProgramFailedToComplete: null }
	| { MaxInstructionTraceLengthExceeded: null }
	| { InvalidAccountData: null }
	| { ProgramFailedToCompile: null }
	| { ExecutableModified: null }
	| { InvalidAccountOwner: null }
	| { MaxSeedLengthExceeded: null }
	| { AccountAlreadyInitialized: null }
	| { AccountBorrowOutstanding: null }
	| { ReadonlyDataModified: null }
	| { UninitializedAccount: null }
	| { InvalidArgument: null }
	| { BorshIoError: string }
	| { BuiltinProgramsMustConsumeComputeUnits: null }
	| { MissingRequiredSignature: null }
	| { DuplicateAccountOutOfSync: null }
	| { MaxAccountsExceeded: null }
	| { ArithmeticOverflow: null }
	| { InvalidError: null }
	| { InvalidSeeds: null }
	| { DuplicateAccountIndex: null }
	| { ReadonlyLamportChange: null }
	| { InsufficientFunds: null };
export interface JsonRpcError {
	code: bigint;
	message: string;
}
export type Lamport = bigint;
export interface LoadedAddresses {
	writable: Array<Pubkey>;
	readonly: Array<Pubkey>;
}
export type LogFilter =
	| { ShowAll: null }
	| { HideAll: null }
	| { ShowPattern: Regex }
	| { HidePattern: Regex };
export type MicroLamport = bigint;
export type Mode = { Demo: null } | { Normal: null };
export type MultiGetAccountInfoResult =
	| {
			Consistent: GetAccountInfoResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetAccountInfoResult]> };
export type MultiGetBalanceResult =
	| { Consistent: GetBalanceResult }
	| { Inconsistent: Array<[RpcSource, GetBalanceResult]> };
export type MultiGetBlockResult =
	| { Consistent: GetBlockResult }
	| { Inconsistent: Array<[RpcSource, GetBlockResult]> };
export type MultiGetRecentPrioritizationFeesResult =
	| {
			Consistent: GetRecentPrioritizationFeesResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetRecentPrioritizationFeesResult]> };
export type MultiGetSignatureStatusesResult =
	| {
			Consistent: GetSignatureStatusesResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetSignatureStatusesResult]> };
export type MultiGetSignaturesForAddressResult =
	| {
			Consistent: GetSignaturesForAddressResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetSignaturesForAddressResult]> };
export type MultiGetSlotResult =
	| { Consistent: GetSlotResult }
	| { Inconsistent: Array<[RpcSource, GetSlotResult]> };
export type MultiGetTokenAccountBalanceResult =
	| {
			Consistent: GetTokenAccountBalanceResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetTokenAccountBalanceResult]> };
export type MultiGetTransactionResult =
	| {
			Consistent: GetTransactionResult;
	  }
	| { Inconsistent: Array<[RpcSource, GetTransactionResult]> };
export type MultiRequestResult =
	| { Consistent: RequestResult }
	| { Inconsistent: Array<[RpcSource, RequestResult]> };
export type MultiSendTransactionResult =
	| {
			Consistent: SendTransactionResult;
	  }
	| { Inconsistent: Array<[RpcSource, SendTransactionResult]> };
export type NumSubnetNodes = number;
export interface OverrideProvider {
	overrideUrl: [] | [RegexSubstitution];
}
export interface ParsedAccount {
	space: bigint;
	parsed: string;
	program: Pubkey;
}
export interface PrioritizationFee {
	prioritizationFee: MicroLamport;
	slot: Slot;
}
export type ProviderError =
	| {
			TooFewCycles: { expected: bigint; received: bigint };
	  }
	| { InvalidRpcConfig: string }
	| { UnsupportedCluster: string };
export type Pubkey = string;
export type Regex = string;
export interface RegexSubstitution {
	pattern: Regex;
	replacement: string;
}
export type RejectionCode =
	| { NoError: null }
	| { CanisterError: null }
	| { SysTransient: null }
	| { DestinationInvalid: null }
	| { Unknown: null }
	| { SysFatal: null }
	| { CanisterReject: null };
export type RequestCostResult = { Ok: bigint } | { Err: RpcError };
export type RequestResult = { Ok: string } | { Err: RpcError };
export interface Reward {
	lamports: bigint;
	postBalance: bigint;
	commission: [] | [number];
	pubkey: Pubkey;
	rewardType: [] | [{ fee: null } | { staking: null } | { rent: null } | { voting: null }];
}
export type RoundingError = bigint;
export type RpcAccess =
	| {
			Authenticated: { publicUrl: [] | [string]; auth: RpcAuth };
	  }
	| { Unauthenticated: { publicUrl: string } };
export type RpcAuth = { BearerToken: { url: string } } | { UrlParameter: { urlPattern: string } };
export interface RpcConfig {
	responseConsensus: [] | [ConsensusStrategy];
	responseSizeEstimate: [] | [bigint];
}
export interface RpcEndpoint {
	url: string;
	headers: [] | [Array<HttpHeader>];
}
export type RpcError =
	| { JsonRpcError: JsonRpcError }
	| { ProviderError: ProviderError }
	| { ValidationError: string }
	| { HttpOutcallError: HttpOutcallError };
export interface RpcProvider {
	access: RpcAccess;
	cluster: SolanaCluster;
}
export type RpcSource = { Custom: RpcEndpoint } | { Supported: SupportedProvider };
export type RpcSources = { Default: SolanaCluster } | { Custom: Array<RpcSource> };
export type SendTransactionEncoding = { base58: null } | { base64: null };
export interface SendTransactionParams {
	encoding: [] | [SendTransactionEncoding];
	preflightCommitment: [] | [CommitmentLevel];
	transaction: string;
	maxRetries: [] | [number];
	minContextSlot: [] | [Slot];
	skipPreflight: [] | [boolean];
}
export type SendTransactionResult = { Ok: Signature } | { Err: RpcError };
export type Signature = string;
export type Slot = bigint;
export type SolanaCluster = { Mainnet: null } | { Testnet: null } | { Devnet: null };
export type SupportedProvider =
	| { AnkrMainnet: null }
	| { AlchemyDevnet: null }
	| { DrpcMainnet: null }
	| { ChainstackDevnet: null }
	| { AlchemyMainnet: null }
	| { HeliusDevnet: null }
	| { AnkrDevnet: null }
	| { DrpcDevnet: null }
	| { ChainstackMainnet: null }
	| { PublicNodeMainnet: null }
	| { HeliusMainnet: null };
export type Timestamp = bigint;
export interface TokenAmount {
	decimals: number;
	uiAmount: [] | [number];
	uiAmountString: string;
	amount: string;
}
export type TransactionConfirmationStatus =
	| { finalized: null }
	| { confirmed: null }
	| { processed: null };
export type TransactionDetails = { none: null } | { accounts: null } | { signatures: null };
export type TransactionError =
	| { ProgramCacheHitMaxLimit: null }
	| { InvalidAccountForFee: null }
	| { AddressLookupTableNotFound: null }
	| { MissingSignatureForFee: null }
	| { WouldExceedAccountDataBlockLimit: null }
	| { AccountInUse: null }
	| { DuplicateInstruction: number }
	| { AccountNotFound: null }
	| { TooManyAccountLocks: null }
	| { InvalidAccountIndex: null }
	| { AlreadyProcessed: null }
	| { WouldExceedAccountDataTotalLimit: null }
	| { InvalidAddressLookupTableIndex: null }
	| { SanitizeFailure: null }
	| { ResanitizationNeeded: null }
	| { InvalidRentPayingAccount: null }
	| { MaxLoadedAccountsDataSizeExceeded: null }
	| { InvalidAddressLookupTableData: null }
	| { InvalidWritableAccount: null }
	| { WouldExceedMaxAccountCostLimit: null }
	| { InvalidLoadedAccountsDataSizeLimit: null }
	| { InvalidProgramForExecution: null }
	| { InstructionError: [number, InstructionError] }
	| { InsufficientFundsForRent: { account_index: number } }
	| { UnsupportedVersion: null }
	| { ClusterMaintenance: null }
	| { WouldExceedMaxVoteCostLimit: null }
	| { SignatureFailure: null }
	| { ProgramAccountNotFound: null }
	| { AccountLoadedTwice: null }
	| { ProgramExecutionTemporarilyRestricted: { account_index: number } }
	| { AccountBorrowOutstanding: null }
	| { WouldExceedMaxBlockCostLimit: null }
	| { InvalidAddressLookupTableOwner: null }
	| { InsufficientFundsForFee: null }
	| { CallChainTooDeep: null }
	| { UnbalancedTransaction: null }
	| { CommitCancelled: null }
	| { BlockhashNotFound: null };
export interface TransactionStatus {
	err: [] | [TransactionError];
	status: { Ok: null } | { Err: TransactionError };
	confirmationStatus: [] | [TransactionConfirmationStatus];
	slot: Slot;
}
export interface TransactionStatusMeta {
	fee: bigint;
	status: { Ok: null } | { Err: TransactionError };
	preBalances: BigUint64Array | bigint[];
	postTokenBalances: [] | [Array<TransactionTokenBalance>];
	innerInstructions: [] | [Array<InnerInstructions>];
	postBalances: BigUint64Array | bigint[];
	loadedAddresses: [] | [LoadedAddresses];
	rewards: [] | [Array<Reward>];
	logMessages: [] | [Array<string>];
	returnData: [] | [{ data: string; programId: Pubkey }];
	preTokenBalances: [] | [Array<TransactionTokenBalance>];
	computeUnitsConsumed: [] | [bigint];
}
export interface TransactionTokenBalance {
	uiTokenAmount: TokenAmount;
	owner: [] | [Pubkey];
	accountIndex: number;
	mint: string;
	programId: [] | [Pubkey];
}
export interface _SERVICE {
	getAccountInfo: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetAccountInfoParams],
		MultiGetAccountInfoResult
	>;
	getAccountInfoCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetAccountInfoParams],
		RequestCostResult
	>;
	getBalance: ActorMethod<[RpcSources, [] | [RpcConfig], GetBalanceParams], MultiGetBalanceResult>;
	getBalanceCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetBalanceParams],
		RequestCostResult
	>;
	getBlock: ActorMethod<[RpcSources, [] | [RpcConfig], GetBlockParams], MultiGetBlockResult>;
	getBlockCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetBlockParams],
		RequestCostResult
	>;
	getProviders: ActorMethod<[], Array<[SupportedProvider, RpcProvider]>>;
	getRecentPrioritizationFees: ActorMethod<
		[
			RpcSources,
			[] | [GetRecentPrioritizationFeesRpcConfig],
			[] | [GetRecentPrioritizationFeesParams]
		],
		MultiGetRecentPrioritizationFeesResult
	>;
	getRecentPrioritizationFeesCyclesCost: ActorMethod<
		[
			RpcSources,
			[] | [GetRecentPrioritizationFeesRpcConfig],
			[] | [GetRecentPrioritizationFeesParams]
		],
		RequestCostResult
	>;
	getSignatureStatuses: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetSignatureStatusesParams],
		MultiGetSignatureStatusesResult
	>;
	getSignatureStatusesCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetSignatureStatusesParams],
		RequestCostResult
	>;
	getSignaturesForAddress: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetSignaturesForAddressParams],
		MultiGetSignaturesForAddressResult
	>;
	getSignaturesForAddressCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetSignaturesForAddressParams],
		RequestCostResult
	>;
	getSlot: ActorMethod<
		[RpcSources, [] | [GetSlotRpcConfig], [] | [GetSlotParams]],
		MultiGetSlotResult
	>;
	getSlotCyclesCost: ActorMethod<
		[RpcSources, [] | [GetSlotRpcConfig], [] | [GetSlotParams]],
		RequestCostResult
	>;
	getTokenAccountBalance: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetTokenAccountBalanceParams],
		MultiGetTokenAccountBalanceResult
	>;
	getTokenAccountBalanceCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetTokenAccountBalanceParams],
		RequestCostResult
	>;
	getTransaction: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetTransactionParams],
		MultiGetTransactionResult
	>;
	getTransactionCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], GetTransactionParams],
		RequestCostResult
	>;
	jsonRequest: ActorMethod<[RpcSources, [] | [RpcConfig], string], MultiRequestResult>;
	jsonRequestCyclesCost: ActorMethod<[RpcSources, [] | [RpcConfig], string], RequestCostResult>;
	sendTransaction: ActorMethod<
		[RpcSources, [] | [RpcConfig], SendTransactionParams],
		MultiSendTransactionResult
	>;
	sendTransactionCyclesCost: ActorMethod<
		[RpcSources, [] | [RpcConfig], SendTransactionParams],
		RequestCostResult
	>;
	updateApiKeys: ActorMethod<[Array<[SupportedProvider, [] | [string]]>], undefined>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
