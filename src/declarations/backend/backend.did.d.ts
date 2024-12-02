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
export type AllowSigningError =
	| { ApproveError: ApproveError }
	| { Other: string }
	| { FailedToContactCyclesLedger: null };
export type ApiEnabled = { ReadOnly: null } | { Enabled: null } | { Disabled: null };
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
export type Arg = { Upgrade: null } | { Init: InitArg };
export type ArgumentValue = { Int: number } | { String: string };
export type BitcoinNetwork = { mainnet: null } | { regtest: null } | { testnet: null };
export type BtcAddPendingTransactionError = {
	InternalError: { msg: string };
};
export interface BtcAddPendingTransactionRequest {
	txid: Uint8Array | number[];
	network: BitcoinNetwork;
	address: string;
	utxos: Array<Utxo>;
}
export interface BtcGetPendingTransactionsReponse {
	transactions: Array<PendingTransaction>;
}
export interface BtcGetPendingTransactionsRequest {
	network: BitcoinNetwork;
	address: string;
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
	api: [] | [Guards];
	derivation_origin: [] | [string];
	ecdsa_key_name: string;
	cfs_canister_id: [] | [Principal];
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
export interface DappCarouselSettings {
	hidden_dapp_ids: Array<string>;
}
export interface DappSettings {
	dapp_carousel: DappCarouselSettings;
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
	derivation_origin: [] | [string];
	ecdsa_key_name: string;
	cfs_canister_id: [] | [Principal];
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
export type MigrationError =
	| { TargetLockFailed: null }
	| { TargetUnlockFailed: null }
	| { CouldNotGetTargetPostStats: null }
	| { CouldNotGetTargetPriorStats: null }
	| { DataMigrationFailed: null }
	| { TargetStatsMismatch: [Stats, Stats] }
	| { Unknown: null }
	| { TargetCanisterNotEmpty: Stats }
	| { NoMigrationInProgress: null };
export type MigrationProgress =
	| {
			MigratedUserTokensUpTo: [] | [Principal];
	  }
	| { Failed: MigrationError }
	| { MigratedUserTimestampsUpTo: [] | [Principal] }
	| { MigratedCustomTokensUpTo: [] | [Principal] }
	| { CheckingDataMigration: null }
	| { MigratedUserProfilesUpTo: [] | [[bigint, Principal]] }
	| { UnlockingTarget: null }
	| { Unlocking: null }
	| { Completed: null }
	| { Pending: null }
	| { LockingTarget: null }
	| { CheckingTarget: null };
export interface MigrationReport {
	to: Principal;
	progress: MigrationProgress;
}
export interface OisyUser {
	principal: Principal;
	pouh_verified: boolean;
	updated_timestamp: bigint;
}
export interface Outpoint {
	txid: Uint8Array | number[];
	vout: number;
}
export interface PendingTransaction {
	txid: Uint8Array | number[];
	utxos: Array<Utxo>;
}
export type Result = { Ok: null } | { Err: AddUserCredentialError };
export type Result_1 = { Ok: null } | { Err: AllowSigningError };
export type Result_2 = { Ok: null } | { Err: BtcAddPendingTransactionError };
export type Result_3 =
	| { Ok: BtcGetPendingTransactionsReponse }
	| { Err: BtcAddPendingTransactionError };
export type Result_4 = { Ok: SelectedUtxosFeeResponse } | { Err: SelectedUtxosFeeError };
export type Result_5 = { Ok: UserProfile } | { Err: GetUserProfileError };
export type Result_6 = { Ok: MigrationReport } | { Err: string };
export type Result_7 = { Ok: null } | { Err: string };
export type Result_8 = { Ok: TopUpCyclesLedgerResponse } | { Err: TopUpCyclesLedgerError };
export type SelectedUtxosFeeError =
	| { PendingTransactions: null }
	| { InternalError: { msg: string } };
export interface SelectedUtxosFeeRequest {
	network: BitcoinNetwork;
	amount_satoshis: bigint;
	min_confirmations: [] | [number];
}
export interface SelectedUtxosFeeResponse {
	fee_satoshis: bigint;
	utxos: Array<Utxo>;
}
export interface Settings {
	dapp: DappSettings;
}
export interface Stats {
	user_profile_count: bigint;
	custom_token_count: bigint;
	user_timestamps_count: bigint;
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
export type TopUpCyclesLedgerError =
	| {
			InvalidArgPercentageOutOfRange: {
				max: number;
				min: number;
				percentage: number;
			};
	  }
	| { CouldNotGetBalanceFromCyclesLedger: null }
	| {
			CouldNotTopUpCyclesLedger: {
				tried_to_send: bigint;
				available: bigint;
			};
	  };
export interface TopUpCyclesLedgerRequest {
	threshold: [] | [bigint];
	percentage: [] | [number];
}
export interface TopUpCyclesLedgerResponse {
	backend_cycles: bigint;
	ledger_balance: bigint;
	topped_up: bigint;
}
export interface UserCredential {
	issuer: string;
	verified_date_timestamp: [] | [bigint];
	credential_type: CredentialType;
}
export interface UserProfile {
	credentials: Array<UserCredential>;
	version: [] | [bigint];
	settings: Settings;
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
export interface Utxo {
	height: number;
	value: bigint;
	outpoint: Outpoint;
}
export interface _SERVICE {
	add_user_credential: ActorMethod<[AddUserCredentialRequest], Result>;
	allow_signing: ActorMethod<[], Result_1>;
	btc_add_pending_transaction: ActorMethod<[BtcAddPendingTransactionRequest], Result_2>;
	btc_get_pending_transactions: ActorMethod<[BtcGetPendingTransactionsRequest], Result_3>;
	btc_select_user_utxos_fee: ActorMethod<[SelectedUtxosFeeRequest], Result_4>;
	bulk_up: ActorMethod<[Uint8Array | number[]], undefined>;
	config: ActorMethod<[], Config>;
	create_user_profile: ActorMethod<[], UserProfile>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	get_user_profile: ActorMethod<[], Result_5>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	list_custom_tokens: ActorMethod<[], Array<CustomToken>>;
	list_user_tokens: ActorMethod<[], Array<UserToken>>;
	list_users: ActorMethod<[ListUsersRequest], ListUsersResponse>;
	migrate_user_data_to: ActorMethod<[Principal], Result_6>;
	migration: ActorMethod<[], [] | [MigrationReport]>;
	migration_stop_timer: ActorMethod<[], Result_7>;
	remove_user_token: ActorMethod<[UserTokenId], undefined>;
	set_custom_token: ActorMethod<[CustomToken], undefined>;
	set_guards: ActorMethod<[Guards], undefined>;
	set_many_custom_tokens: ActorMethod<[Array<CustomToken>], undefined>;
	set_many_user_tokens: ActorMethod<[Array<UserToken>], undefined>;
	set_user_token: ActorMethod<[UserToken], undefined>;
	stats: ActorMethod<[], Stats>;
	step_migration: ActorMethod<[], undefined>;
	top_up_cycles_ledger: ActorMethod<[[] | [TopUpCyclesLedgerRequest]], Result_8>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
