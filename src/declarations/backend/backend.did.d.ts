import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface AccountSnapshot {
	decimals: number;
	token_address: EthAddress;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction>;
	account: EthAddress;
	timestamp: bigint;
	amount: bigint;
}
export type AccountSnapshotFor =
	| { Erc20Sepolia: AccountSnapshot }
	| { EthSepolia: AccountSnapshot }
	| { SplTestnet: AccountSnapshot_1 }
	| { BtcMainnet: AccountSnapshot_2 }
	| { SolDevnet: AccountSnapshot_1 }
	| { Erc20Mainnet: AccountSnapshot }
	| { SolTestnet: AccountSnapshot_1 }
	| { Icrcv2: AccountSnapshot_3 }
	| { BtcRegtest: AccountSnapshot_2 }
	| { SplDevnet: AccountSnapshot_1 }
	| { EthMainnet: AccountSnapshot }
	| { SplMainnet: AccountSnapshot_1 }
	| { SolLocal: AccountSnapshot_1 }
	| { BtcTestnet: AccountSnapshot_2 }
	| { SplLocal: AccountSnapshot_1 }
	| { SolMainnet: AccountSnapshot_1 };
export interface AccountSnapshot_1 {
	decimals: number;
	token_address: string;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_1>;
	account: string;
	timestamp: bigint;
	amount: bigint;
}
export interface AccountSnapshot_2 {
	decimals: number;
	token_address: BtcTokenId;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_2>;
	account: BtcAddress;
	timestamp: bigint;
	amount: bigint;
}
export interface AccountSnapshot_3 {
	decimals: number;
	token_address: IcrcTokenId;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_3>;
	account: Icrcv2AccountId;
	timestamp: bigint;
	amount: bigint;
}
export type AddDappSettingsError =
	| { MaxHiddenDappIds: null }
	| { VersionMismatch: null }
	| { DappIdTooLong: null }
	| { UserNotFound: null };
export interface AddHiddenDappIdRequest {
	current_user_version: [] | [bigint];
	dapp_id: string;
}
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
export type AddUserCredentialResult = { Ok: null } | { Err: AddUserCredentialError };
export type AllowSigningError =
	| { ApproveError: ApproveError }
	| { PowChallenge: ChallengeCompletionError }
	| { Other: string }
	| { FailedToContactCyclesLedger: null };
export interface AllowSigningRequest {
	nonce: bigint;
}
export interface AllowSigningResponse {
	status: AllowSigningStatus;
	challenge_completion: [] | [ChallengeCompletion];
	allowed_cycles: bigint;
}
export type AllowSigningStatus = { Skipped: null } | { Failed: null } | { Executed: null };
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
export type BtcAddress =
	| { P2WPKH: string }
	| { P2PKH: string }
	| { P2WSH: string }
	| { P2SH: string }
	| { P2TR: string };
export interface BtcGetPendingTransactionsReponse {
	transactions: Array<PendingTransaction>;
}
export interface BtcGetPendingTransactionsRequest {
	network: BitcoinNetwork;
	address: string;
}
export type BtcTokenId = { Native: null };
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
export interface ChallengeCompletion {
	solved_duration_ms: bigint;
	next_allowance_ms: bigint;
	next_difficulty: number;
	current_difficulty: number;
}
export type ChallengeCompletionError =
	| { InvalidNonce: null }
	| { MissingChallenge: null }
	| { ExpiredChallenge: null }
	| { MissingUserProfile: null }
	| { ChallengeAlreadySolved: null };
export interface Config {
	derivation_origin: [] | [string];
	ecdsa_key_name: string;
	cfs_canister_id: [] | [Principal];
	allowed_callers: Array<Principal>;
	supported_credentials: [] | [Array<SupportedCredential>];
	ic_root_key_raw: [] | [Uint8Array | number[]];
}
export type CreateChallengeError =
	| { ChallengeInProgress: null }
	| { MissingUserProfile: null }
	| { RandomnessError: string }
	| { Other: string };
export interface CreateChallengeResponse {
	difficulty: number;
	start_timestamp_ms: bigint;
	expiry_timestamp_ms: bigint;
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
export type EthAddress = { Public: string };
export type GetAllowedCyclesError = { Other: string } | { FailedToContactCyclesLedger: null };
export interface GetAllowedCyclesResponse {
	allowed_cycles: bigint;
}
export type GetUserProfileError = { NotFound: null };
export interface HasUserProfileResponse {
	has_user_profile: boolean;
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
export type IcrcTokenId =
	| {
			Icrc: { ledger: Principal; index: [] | [Principal] };
	  }
	| { Native: null };
export type Icrcv2AccountId =
	| { Account: Uint8Array | number[] }
	| {
			WithPrincipal: {
				owner: Principal;
				subaccount: [] | [Uint8Array | number[]];
			};
	  };
export interface InitArg {
	derivation_origin: [] | [string];
	ecdsa_key_name: string;
	cfs_canister_id: [] | [Principal];
	allowed_callers: Array<Principal>;
	supported_credentials: [] | [Array<SupportedCredential>];
	ic_root_key_der: [] | [Uint8Array | number[]];
}
export interface NetworkSettings {
	enabled: boolean;
	is_testnet: boolean;
}
export type NetworkSettingsFor =
	| { InternetComputer: null }
	| { BaseSepolia: null }
	| { PolygonMainnet: null }
	| { SolanaTestnet: null }
	| { BitcoinRegtest: null }
	| { SolanaDevnet: null }
	| { PolygonAmoy: null }
	| { EthereumSepolia: null }
	| { BitcoinTestnet: null }
	| { BaseMainnet: null }
	| { BscMainnet: null }
	| { SolanaLocal: null }
	| { EthereumMainnet: null }
	| { SolanaMainnet: null }
	| { BitcoinMainnet: null }
	| { BscTestnet: null };
export interface NetworksSettings {
	networks: Array<[NetworkSettingsFor, NetworkSettings]>;
	testnets: TestnetsSettings;
}
export interface Outpoint {
	txid: Uint8Array | number[];
	vout: number;
}
export interface PendingTransaction {
	txid: Uint8Array | number[];
	utxos: Array<Utxo>;
}
export type Result = { Ok: null } | { Err: AddDappSettingsError };
export type Result_1 = { Ok: AllowSigningResponse } | { Err: AllowSigningError };
export type Result_2 = { Ok: null } | { Err: BtcAddPendingTransactionError };
export type Result_3 =
	| { Ok: BtcGetPendingTransactionsReponse }
	| { Err: BtcAddPendingTransactionError };
export type Result_4 = { Ok: SelectedUtxosFeeResponse } | { Err: SelectedUtxosFeeError };
export type Result_5 = { Ok: CreateChallengeResponse } | { Err: CreateChallengeError };
export type Result_6 = { Ok: GetAllowedCyclesResponse } | { Err: GetAllowedCyclesError };
export type Result_7 = { Ok: UserProfile } | { Err: GetUserProfileError };
export type Result_8 = { Ok: null } | { Err: SaveTestnetsSettingsError };
export interface SaveNetworksSettingsRequest {
	networks: Array<[NetworkSettingsFor, NetworkSettings]>;
	current_user_version: [] | [bigint];
}
export type SaveTestnetsSettingsError = { VersionMismatch: null } | { UserNotFound: null };
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
export interface SetShowTestnetsRequest {
	current_user_version: [] | [bigint];
	show_testnets: boolean;
}
export interface Settings {
	networks: NetworksSettings;
	dapp: DappSettings;
}
export interface SplToken {
	decimals: [] | [number];
	token_address: string;
	symbol: [] | [string];
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
export interface TestnetsSettings {
	show_testnets: boolean;
}
export type Token = { Icrc: IcrcToken } | { SplDevnet: SplToken } | { SplMainnet: SplToken };
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
export type TopUpCyclesLedgerResult =
	| { Ok: TopUpCyclesLedgerResponse }
	| { Err: TopUpCyclesLedgerError };
export interface Transaction {
	transaction_type: TransactionType;
	network: {};
	counterparty: EthAddress;
	timestamp: bigint;
	amount: bigint;
}
export type TransactionType = { Send: null } | { Receive: null };
export interface Transaction_1 {
	transaction_type: TransactionType;
	network: {};
	counterparty: string;
	timestamp: bigint;
	amount: bigint;
}
export interface Transaction_2 {
	transaction_type: TransactionType;
	network: {};
	counterparty: BtcAddress;
	timestamp: bigint;
	amount: bigint;
}
export interface Transaction_3 {
	transaction_type: TransactionType;
	network: {};
	counterparty: Icrcv2AccountId;
	timestamp: bigint;
	amount: bigint;
}
export interface UserCredential {
	issuer: string;
	verified_date_timestamp: [] | [bigint];
	credential_type: CredentialType;
}
export interface UserProfile {
	credentials: Array<UserCredential>;
	version: [] | [bigint];
	settings: [] | [Settings];
	created_timestamp: bigint;
	updated_timestamp: bigint;
}
export interface UserSnapshot {
	accounts: Array<AccountSnapshotFor>;
	timestamp: [] | [bigint];
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
	add_user_credential: ActorMethod<[AddUserCredentialRequest], AddUserCredentialResult>;
	add_user_hidden_dapp_id: ActorMethod<[AddHiddenDappIdRequest], Result>;
	allow_signing: ActorMethod<[[] | [AllowSigningRequest]], Result_1>;
	btc_add_pending_transaction: ActorMethod<[BtcAddPendingTransactionRequest], Result_2>;
	btc_get_pending_transactions: ActorMethod<[BtcGetPendingTransactionsRequest], Result_3>;
	btc_select_user_utxos_fee: ActorMethod<[SelectedUtxosFeeRequest], Result_4>;
	config: ActorMethod<[], Config>;
	create_pow_challenge: ActorMethod<[], Result_5>;
	create_user_profile: ActorMethod<[], UserProfile>;
	get_account_creation_timestamps: ActorMethod<[], Array<[Principal, bigint]>>;
	get_allowed_cycles: ActorMethod<[], Result_6>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	get_snapshot: ActorMethod<[], [] | [UserSnapshot]>;
	get_user_profile: ActorMethod<[], Result_7>;
	has_user_profile: ActorMethod<[], HasUserProfileResponse>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	list_custom_tokens: ActorMethod<[], Array<CustomToken>>;
	list_user_tokens: ActorMethod<[], Array<UserToken>>;
	remove_user_token: ActorMethod<[UserTokenId], undefined>;
	set_custom_token: ActorMethod<[CustomToken], undefined>;
	set_many_custom_tokens: ActorMethod<[Array<CustomToken>], undefined>;
	set_many_user_tokens: ActorMethod<[Array<UserToken>], undefined>;
	set_snapshot: ActorMethod<[UserSnapshot], undefined>;
	set_user_show_testnets: ActorMethod<[SetShowTestnetsRequest], Result_8>;
	set_user_token: ActorMethod<[UserToken], undefined>;
	stats: ActorMethod<[], Stats>;
	top_up_cycles_ledger: ActorMethod<[[] | [TopUpCyclesLedgerRequest]], TopUpCyclesLedgerResult>;
	update_user_network_settings: ActorMethod<[SaveNetworksSettingsRequest], Result_8>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
