import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
}
export type Arg = { Upgrade: null } | { Init: InitArg };
export type BitcoinNetwork = { mainnet: null } | { regtest: null } | { testnet: null };
export interface CallerPaysIcrc2Tokens {
	ledger: Principal;
}
export interface CanisterStatusResultV2 {
	controller: Principal;
	status: CanisterStatusType;
	freezing_threshold: bigint;
	balance: Array<[Uint8Array | number[], bigint]>;
	memory_size: bigint;
	cycles: bigint;
	settings: DefiniteCanisterSettingsArgs;
	idle_cycles_burned_per_day: bigint;
	module_hash: [] | [Uint8Array | number[]];
}
export type CanisterStatusType = { stopped: null } | { stopping: null } | { running: null };
export interface Config {
	ecdsa_key_name: string;
	ic_root_key_raw: [] | [Uint8Array | number[]];
	cycles_ledger: Principal;
}
export interface DefiniteCanisterSettingsArgs {
	controller: Principal;
	freezing_threshold: bigint;
	controllers: Array<Principal>;
	memory_allocation: bigint;
	compute_allocation: bigint;
}
export type EcdsaCurve = { secp256k1: null };
export interface EcdsaKeyId {
	name: string;
	curve: EcdsaCurve;
}
export interface EcdsaPublicKeyArgument {
	key_id: EcdsaKeyId;
	canister_id: [] | [Principal];
	derivation_path: Array<Uint8Array | number[]>;
}
export interface EcdsaPublicKeyResponse {
	public_key: Uint8Array | number[];
	chain_code: Uint8Array | number[];
}
export type GenericSigningError =
	| { SigningError: [RejectionCode, string] }
	| { PaymentError: PaymentError };
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
export interface InitArg {
	ecdsa_key_name: string;
	ic_root_key_der: [] | [Uint8Array | number[]];
	cycles_ledger: [] | [Principal];
}
export interface PatronPaysIcrc2Tokens {
	ledger: Principal;
	patron: Account;
}
export type PaymentError =
	| { LedgerUnreachable: CallerPaysIcrc2Tokens }
	| { UnsupportedPaymentType: null }
	| { LedgerError: { error: WithdrawFromError; ledger: Principal } }
	| { InsufficientFunds: { needed: bigint; available: bigint } };
export type PaymentType =
	| { PatronPaysIcrc2Tokens: PatronPaysIcrc2Tokens }
	| { AttachedCycles: null }
	| { CallerPaysIcrc2Cycles: null }
	| { CallerPaysIcrc2Tokens: CallerPaysIcrc2Tokens }
	| { PatronPaysIcrc2Cycles: Account };
export type RejectionCode =
	| { NoError: null }
	| { CanisterError: null }
	| { SysTransient: null }
	| { DestinationInvalid: null }
	| { Unknown: null }
	| { SysFatal: null }
	| { CanisterReject: null };
export type Result = { Ok: string } | { Err: GenericSigningError };
export type Result_1 = { Ok: bigint } | { Err: GenericSigningError };
export type Result_2 = { Ok: [EcdsaPublicKeyResponse] } | { Err: GenericSigningError };
export type Result_3 = { Ok: [SignWithEcdsaResponse] } | { Err: GenericSigningError };
export interface SignRequest {
	to: string;
	gas: bigint;
	value: bigint;
	max_priority_fee_per_gas: bigint;
	data: [] | [string];
	max_fee_per_gas: bigint;
	chain_id: bigint;
	nonce: bigint;
}
export interface SignWithEcdsaArgument {
	key_id: EcdsaKeyId;
	derivation_path: Array<Uint8Array | number[]>;
	message_hash: Uint8Array | number[];
}
export interface SignWithEcdsaResponse {
	signature: Uint8Array | number[];
}
export type WithdrawFromError =
	| {
			GenericError: { message: string; error_code: bigint };
	  }
	| { TemporarilyUnavailable: null }
	| { InsufficientAllowance: { allowance: bigint } }
	| { Duplicate: { duplicate_of: bigint } }
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
	btc_caller_address: ActorMethod<[BitcoinNetwork, [] | [PaymentType]], Result>;
	btc_caller_balance: ActorMethod<[BitcoinNetwork, [] | [PaymentType]], Result_1>;
	caller_btc_address: ActorMethod<[BitcoinNetwork], string>;
	caller_btc_balance: ActorMethod<[BitcoinNetwork], bigint>;
	caller_eth_address: ActorMethod<[], string>;
	config: ActorMethod<[], Config>;
	eth_address_of: ActorMethod<[Principal], string>;
	eth_address_of_caller: ActorMethod<[[] | [PaymentType]], Result>;
	eth_address_of_principal: ActorMethod<[Principal, [] | [PaymentType]], Result>;
	eth_personal_sign: ActorMethod<[string, [] | [PaymentType]], Result>;
	eth_sign_transaction: ActorMethod<[SignRequest, [] | [PaymentType]], Result>;
	generic_caller_ecdsa_public_key: ActorMethod<
		[EcdsaPublicKeyArgument, [] | [PaymentType]],
		Result_2
	>;
	generic_sign_with_ecdsa: ActorMethod<[[] | [PaymentType], SignWithEcdsaArgument], Result_3>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	personal_sign: ActorMethod<[string], string>;
	sign_prehash: ActorMethod<[string], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
