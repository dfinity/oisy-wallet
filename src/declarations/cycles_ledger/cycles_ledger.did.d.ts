import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
}
export interface Allowance {
	allowance: bigint;
	expires_at: [] | [bigint];
}
export interface AllowanceArgs {
	account: Account;
	spender: Account;
}
export interface ApproveArgs {
	fee: [] | [bigint];
	memo: [] | [Uint8Array | number[]];
	from_subaccount: [] | [Uint8Array | number[]];
	created_at_time: [] | [bigint];
	amount: bigint;
	expected_allowance: [] | [bigint];
	expires_at: [] | [bigint];
	spender: Account;
}
export type ApproveError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| { Duplicate: { duplicate_of: bigint } }
	| { BadFee: { expected_fee: bigint } }
	| { AllowanceChanged: { current_allowance: bigint } }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| { Expired: { ledger_time: bigint } }
	| { InsufficientFunds: { balance: bigint } };
export type BlockIndex = bigint;
export interface CanisterSettings {
	freezing_threshold: [] | [bigint];
	controllers: [] | [Array<Principal>];
	reserved_cycles_limit: [] | [bigint];
	memory_allocation: [] | [bigint];
	compute_allocation: [] | [bigint];
}
export type ChangeIndexId = { SetTo: Principal } | { Unset: null };
export interface CmcCreateCanisterArgs {
	subnet_selection: [] | [SubnetSelection];
	settings: [] | [CanisterSettings];
}
export interface CreateCanisterArgs {
	from_subaccount: [] | [Uint8Array | number[]];
	created_at_time: [] | [bigint];
	amount: bigint;
	creation_args: [] | [CmcCreateCanisterArgs];
}
export type CreateCanisterError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| {
			Duplicate: { duplicate_of: bigint; canister_id: [] | [Principal] };
	  }
	| { CreatedInFuture: { ledger_time: bigint } }
	| {
			FailedToCreate: {
				error: string;
				refund_block: [] | [BlockIndex];
				fee_block: [] | [BlockIndex];
			};
	  }
	| { TooOld: null }
	| { InsufficientFunds: { balance: bigint } };
export interface CreateCanisterFromArgs {
	spender_subaccount: [] | [Uint8Array | number[]];
	from: Account;
	created_at_time: [] | [bigint];
	amount: bigint;
	creation_args: [] | [CmcCreateCanisterArgs];
}
export type CreateCanisterFromError =
	| {
			FailedToCreateFrom: {
				create_from_block: [] | [BlockIndex];
				rejection_code: RejectionCode;
				refund_block: [] | [BlockIndex];
				approval_refund_block: [] | [BlockIndex];
				rejection_reason: string;
			};
	  }
	| { GenericError: { message: string; error_code: bigint } }
	| { TemporarilyUnavailable: null }
	| { InsufficientAllowance: { allowance: bigint } }
	| {
			Duplicate: { duplicate_of: bigint; canister_id: [] | [Principal] };
	  }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| { InsufficientFunds: { balance: bigint } };
export interface CreateCanisterSuccess {
	block_id: BlockIndex;
	canister_id: Principal;
}
export interface DataCertificate {
	certificate: Uint8Array | number[];
	hash_tree: Uint8Array | number[];
}
export interface DepositArgs {
	to: Account;
	memo: [] | [Uint8Array | number[]];
}
export interface DepositResult {
	balance: bigint;
	block_index: BlockIndex;
}
export interface GetArchivesArgs {
	from: [] | [Principal];
}
export type GetArchivesResult = Array<{ end: bigint; canister_id: Principal; start: bigint }>;
export type GetBlocksArgs = Array<{ start: bigint; length: bigint }>;
export interface GetBlocksResult {
	log_length: bigint;
	blocks: Array<{ id: bigint; block: Value }>;
	archived_blocks: Array<{ args: GetBlocksArgs; callback: [Principal, string] }>;
}
export interface HttpRequest {
	url: string;
	method: string;
	body: Uint8Array | number[];
	headers: Array<[string, string]>;
}
export interface HttpResponse {
	body: Uint8Array | number[];
	headers: Array<[string, string]>;
	status_code: number;
}
export interface InitArgs {
	index_id: [] | [Principal];
	max_blocks_per_request: bigint;
}
export type LedgerArgs = { Upgrade: [] | [UpgradeArgs] } | { Init: InitArgs };
export type MetadataValue =
	| { Int: bigint }
	| { Nat: bigint }
	| { Blob: Uint8Array | number[] }
	| { Text: string };
export type RejectionCode =
	| { NoError: null }
	| { CanisterError: null }
	| { SysTransient: null }
	| { DestinationInvalid: null }
	| { Unknown: null }
	| { SysFatal: null }
	| { CanisterReject: null };
export interface SubnetFilter {
	subnet_type: [] | [string];
}
export type SubnetSelection = { Filter: SubnetFilter } | { Subnet: { subnet: Principal } };
export interface SupportedBlockType {
	url: string;
	block_type: string;
}
export interface SupportedStandard {
	url: string;
	name: string;
}
export interface TransferArgs {
	to: Account;
	fee: [] | [bigint];
	memo: [] | [Uint8Array | number[]];
	from_subaccount: [] | [Uint8Array | number[]];
	created_at_time: [] | [bigint];
	amount: bigint;
}
export type TransferError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| { BadBurn: { min_burn_amount: bigint } }
	| { Duplicate: { duplicate_of: bigint } }
	| { BadFee: { expected_fee: bigint } }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| { InsufficientFunds: { balance: bigint } };
export interface TransferFromArgs {
	to: Account;
	fee: [] | [bigint];
	spender_subaccount: [] | [Uint8Array | number[]];
	from: Account;
	memo: [] | [Uint8Array | number[]];
	created_at_time: [] | [bigint];
	amount: bigint;
}
export type TransferFromError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| { InsufficientAllowance: { allowance: bigint } }
	| { BadBurn: { min_burn_amount: bigint } }
	| { Duplicate: { duplicate_of: bigint } }
	| { BadFee: { expected_fee: bigint } }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| { InsufficientFunds: { balance: bigint } };
export interface UpgradeArgs {
	change_index_id: [] | [ChangeIndexId];
	max_blocks_per_request: [] | [bigint];
}
export type Value =
	| { Int: bigint }
	| { Map: Array<[string, Value]> }
	| { Nat: bigint }
	| { Nat64: bigint }
	| { Blob: Uint8Array | number[] }
	| { Text: string }
	| { Array: Array<Value> };
export interface WithdrawArgs {
	to: Principal;
	from_subaccount: [] | [Uint8Array | number[]];
	created_at_time: [] | [bigint];
	amount: bigint;
}
export type WithdrawError =
	| {
			FailedToWithdraw: {
				rejection_code: RejectionCode;
				fee_block: [] | [bigint];
				rejection_reason: string;
			};
	  }
	| { GenericError: { message: string; error_code: bigint } }
	| { TemporarilyUnavailable: null }
	| { Duplicate: { duplicate_of: bigint } }
	| { BadFee: { expected_fee: bigint } }
	| { InvalidReceiver: { receiver: Principal } }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| { InsufficientFunds: { balance: bigint } };
export interface WithdrawFromArgs {
	to: Principal;
	spender_subaccount: [] | [Uint8Array | number[]];
	from: Account;
	created_at_time: [] | [bigint];
	amount: bigint;
}
export type WithdrawFromError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| { InsufficientAllowance: { allowance: bigint } }
	| { Duplicate: { duplicate_of: BlockIndex } }
	| { InvalidReceiver: { receiver: Principal } }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { TooOld: null }
	| {
			FailedToWithdrawFrom: {
				withdraw_from_block: [] | [bigint];
				rejection_code: RejectionCode;
				refund_block: [] | [bigint];
				approval_refund_block: [] | [bigint];
				rejection_reason: string;
			};
	  }
	| { InsufficientFunds: { balance: bigint } };
export interface _SERVICE {
	create_canister: ActorMethod<
		[CreateCanisterArgs],
		{ Ok: CreateCanisterSuccess } | { Err: CreateCanisterError }
	>;
	create_canister_from: ActorMethod<
		[CreateCanisterFromArgs],
		{ Ok: CreateCanisterSuccess } | { Err: CreateCanisterFromError }
	>;
	deposit: ActorMethod<[DepositArgs], DepositResult>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	icrc1_balance_of: ActorMethod<[Account], bigint>;
	icrc1_decimals: ActorMethod<[], number>;
	icrc1_fee: ActorMethod<[], bigint>;
	icrc1_metadata: ActorMethod<[], Array<[string, MetadataValue]>>;
	icrc1_minting_account: ActorMethod<[], [] | [Account]>;
	icrc1_name: ActorMethod<[], string>;
	icrc1_supported_standards: ActorMethod<[], Array<SupportedStandard>>;
	icrc1_symbol: ActorMethod<[], string>;
	icrc1_total_supply: ActorMethod<[], bigint>;
	icrc1_transfer: ActorMethod<[TransferArgs], { Ok: BlockIndex } | { Err: TransferError }>;
	icrc2_allowance: ActorMethod<[AllowanceArgs], Allowance>;
	icrc2_approve: ActorMethod<[ApproveArgs], { Ok: bigint } | { Err: ApproveError }>;
	icrc2_transfer_from: ActorMethod<[TransferFromArgs], { Ok: bigint } | { Err: TransferFromError }>;
	icrc3_get_archives: ActorMethod<[GetArchivesArgs], GetArchivesResult>;
	icrc3_get_blocks: ActorMethod<[GetBlocksArgs], GetBlocksResult>;
	icrc3_get_tip_certificate: ActorMethod<[], [] | [DataCertificate]>;
	icrc3_supported_block_types: ActorMethod<[], Array<SupportedBlockType>>;
	withdraw: ActorMethod<[WithdrawArgs], { Ok: BlockIndex } | { Err: WithdrawError }>;
	withdraw_from: ActorMethod<[WithdrawFromArgs], { Ok: BlockIndex } | { Err: WithdrawFromError }>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
