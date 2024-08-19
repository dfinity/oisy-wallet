import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export type AddUserCredentialError =
	| { InvalidCredential: null }
	| { VersionMismatch: null }
	| { ConfigurationError: null }
	| { UserNotFound: null };
export interface AddUserCredentialRequest {
	credential_jwt: string;
	issuer_canister_id: Principal;
	current_user_version: [] | [bigint];
	credential_spec: CredentialSpec;
}
export type ApiEnabled = { ReadOnly: null } | { Enabled: null } | { Disabled: null };
export type Arg = { Upgrade: null } | { Init: InitArg };
export type ArgumentValue = { Int: number } | { String: string };
export type BitcoinNetwork = { mainnet: null } | { regtest: null } | { testnet: null };
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
	api: [] | [Guards];
	ecdsa_key_name: string;
	allowed_callers: Array<Principal>;
	supported_credentials: [] | [Array<SupportedCredential>];
	ic_root_key_raw: [] | [Uint8Array | number[]];
}
export interface CredentialSpec {
	arguments: [] | [Array<[string, ArgumentValue]>];
	credential_type: string;
}
export type CredentialType = { ProofOfUniqueness: null };
export interface CustomToken {
	token: Token;
	version: [] | [bigint];
	enabled: boolean;
}
export interface DefiniteCanisterSettingsArgs {
	controller: Principal;
	freezing_threshold: bigint;
	controllers: Array<Principal>;
	memory_allocation: bigint;
	compute_allocation: bigint;
}
export type GetUserProfileError = { NotFound: null };
export interface Guards {
	user_data: ApiEnabled;
	threshold_key: ApiEnabled;
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
export interface IcrcToken {
	ledger_id: Principal;
	index_id: [] | [Principal];
}
export interface InitArg {
	api: [] | [Guards];
	ecdsa_key_name: string;
	allowed_callers: Array<Principal>;
	supported_credentials: [] | [Array<SupportedCredential>];
	ic_root_key_der: [] | [Uint8Array | number[]];
}
export interface ListUsersRequest {
	updated_after_timestamp: [] | [bigint];
	matches_max_length: [] | [bigint];
}
export interface ListUsersResponse {
	users: Array<OisyUser>;
	matches_max_length: bigint;
}
export type MigrationProgress =
	| {
			MigratedUserTokensUpTo: [] | [Principal];
	  }
	| { MigratedUserTimestampsUpTo: [] | [Principal] }
	| { TargetPreCheckOk: null }
	| { MigratedCustomTokensUpTo: [] | [Principal] }
	| { Locked: null }
	| { MigratedUserProfilesUpTo: [] | [[bigint, Principal]] }
	| { CheckingTargetCanister: null }
	| { TargetLocked: null }
	| { Completed: null }
	| { Pending: null };
export interface MigrationReport {
	to: Principal;
	progress: MigrationProgress;
}
export interface OisyUser {
	principal: Principal;
	pouh_verified: boolean;
	updated_timestamp: bigint;
}
export type Result = { Ok: null } | { Err: AddUserCredentialError };
export type Result_1 = { Ok: UserProfile } | { Err: GetUserProfileError };
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
export interface Stats {
	user_profile_count: bigint;
	custom_token_count: bigint;
	user_token_count: bigint;
}
export interface SupportedCredential {
	ii_canister_id: Principal;
	issuer_origin: string;
	issuer_canister_id: Principal;
	ii_origin: string;
	credential_type: CredentialType;
}
export type Token = { Icrc: IcrcToken };
export interface UserCredential {
	issuer: string;
	verified_date_timestamp: [] | [bigint];
	credential_type: CredentialType;
}
export interface UserProfile {
	credentials: Array<UserCredential>;
	version: [] | [bigint];
	created_timestamp: bigint;
	updated_timestamp: bigint;
}
export interface UserToken {
	decimals: [] | [number];
	version: [] | [bigint];
	enabled: [] | [boolean];
	chain_id: bigint;
	contract_address: string;
	symbol: [] | [string];
}
export interface UserTokenId {
	chain_id: bigint;
	contract_address: string;
}
export interface _SERVICE {
	add_user_credential: ActorMethod<[AddUserCredentialRequest], Result>;
	bulk_up: ActorMethod<[Uint8Array | number[]], undefined>;
	caller_btc_address: ActorMethod<[BitcoinNetwork], string>;
	caller_eth_address: ActorMethod<[], string>;
	config: ActorMethod<[], Config>;
	create_user_profile: ActorMethod<[], UserProfile>;
	eth_address_of: ActorMethod<[Principal], string>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	get_user_profile: ActorMethod<[], Result_1>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	list_custom_tokens: ActorMethod<[], Array<CustomToken>>;
	list_user_tokens: ActorMethod<[], Array<UserToken>>;
	list_users: ActorMethod<[ListUsersRequest], ListUsersResponse>;
	migration: ActorMethod<[], [] | [MigrationReport]>;
	personal_sign: ActorMethod<[string], string>;
	remove_user_token: ActorMethod<[UserTokenId], undefined>;
	set_custom_token: ActorMethod<[CustomToken], undefined>;
	set_guards: ActorMethod<[Guards], undefined>;
	set_many_custom_tokens: ActorMethod<[Array<CustomToken>], undefined>;
	set_many_user_tokens: ActorMethod<[Array<UserToken>], undefined>;
	set_user_token: ActorMethod<[UserToken], undefined>;
	sign_prehash: ActorMethod<[string], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
	stats: ActorMethod<[], Stats>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
