import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

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
export type AddUserHiddenDappIdResult = { Ok: null } | { Err: AddDappSettingsError };
export interface Agreements {
	agreements: UserAgreements;
}
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
export type AllowSigningResult = { Ok: AllowSigningResponse } | { Err: AllowSigningError };
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
export type BtcAddPendingTransactionResult = { Ok: null } | { Err: BtcAddPendingTransactionError };
export type BtcAddress =
	| { P2WPKH: string }
	| { P2PKH: string }
	| { P2WSH: string }
	| { P2SH: string }
	| { P2TR: string };
export interface BtcGetFeePercentilesRequest {
	network: BitcoinNetwork;
}
export interface BtcGetFeePercentilesResponse {
	fee_percentiles: BigUint64Array | bigint[];
}
export type BtcGetFeePercentilesResult =
	| {
			Ok: BtcGetFeePercentilesResponse;
	  }
	| { Err: SelectedUtxosFeeError };
export interface BtcGetPendingTransactionsReponse {
	transactions: Array<PendingTransaction>;
}
export interface BtcGetPendingTransactionsRequest {
	network: BitcoinNetwork;
	address: string;
}
export type BtcGetPendingTransactionsResult =
	| {
			Ok: BtcGetPendingTransactionsReponse;
	  }
	| { Err: BtcAddPendingTransactionError };
export type BtcSelectUserUtxosFeeResult =
	| { Ok: SelectedUtxosFeeResponse }
	| { Err: SelectedUtxosFeeError };
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
export interface Contact {
	id: bigint;
	name: string;
	update_timestamp_ns: bigint;
	addresses: Array<ContactAddressData>;
	image: [] | [ContactImage];
}
export interface ContactAddressData {
	label: [] | [string];
	token_account_id: TokenAccountId;
}
export type ContactError =
	| { InvalidContactData: null }
	| { CanisterMemoryNearCapacity: null }
	| { InvalidImageFormat: null }
	| { ContactNotFound: null }
	| { ImageTooLarge: null }
	| { RandomnessError: null }
	| { ImageExceedsMaxSize: null }
	| { CanisterStatusError: null }
	| { TooManyContactsWithImages: null };
export interface ContactImage {
	data: Uint8Array | number[];
	mime_type: ImageMimeType;
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
export interface CreateContactRequest {
	name: string;
	image: [] | [ContactImage];
}
export type CreateContactResult = { Ok: Contact } | { Err: ContactError };
export type CreatePowChallengeResult =
	| { Ok: CreateChallengeResponse }
	| { Err: CreateChallengeError };
export interface CredentialSpec {
	arguments: [] | [Array<[string, ArgumentValue]>];
	credential_type: string;
}
export type CredentialType = { ProofOfUniqueness: null };
export interface CustomToken {
	token: Token;
	section: [] | [TokenSection];
	version: [] | [bigint];
	enabled: boolean;
	allow_media_source: [] | [boolean];
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
export type DeleteContactResult = { Ok: bigint } | { Err: ContactError };
export interface ErcToken {
	token_address: string;
	chain_id: bigint;
}
export type EthAddress = { Public: string };
export type GetAllowedCyclesError = { Other: string } | { FailedToContactCyclesLedger: null };
export interface GetAllowedCyclesResponse {
	allowed_cycles: bigint;
}
export type GetAllowedCyclesResult =
	| { Ok: GetAllowedCyclesResponse }
	| { Err: GetAllowedCyclesError };
export type GetContactResult = { Ok: Contact } | { Err: ContactError };
export type GetContactsResult = { Ok: Array<Contact> } | { Err: ContactError };
export type GetUserProfileError = { NotFound: null };
export type GetUserProfileResult = { Ok: UserProfile } | { Err: GetUserProfileError };
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
export type Icrcv2AccountId =
	| { Account: Uint8Array | number[] }
	| {
			WithPrincipal: {
				owner: Principal;
				subaccount: [] | [Uint8Array | number[]];
			};
	  };
export type ImageMimeType =
	| { 'image/gif': null }
	| { 'image/png': null }
	| { 'image/jpeg': null }
	| { 'image/webp': null };
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
	| { ArbitrumMainnet: null }
	| { InternetComputer: null }
	| { BaseSepolia: null }
	| { PolygonMainnet: null }
	| { BitcoinRegtest: null }
	| { SolanaDevnet: null }
	| { PolygonAmoy: null }
	| { EthereumSepolia: null }
	| { BitcoinTestnet: null }
	| { BaseMainnet: null }
	| { BscMainnet: null }
	| { SolanaLocal: null }
	| { ArbitrumSepolia: null }
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
export interface SaveAgreementsRequest {
	agreements: UserAgreements;
	current_user_version: [] | [bigint];
}
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
export type SetUserShowTestnetsResult = { Ok: null } | { Err: SaveTestnetsSettingsError };
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
export type Token =
	| { Erc20: ErcToken }
	| { Icrc: IcrcToken }
	| { Erc721: ErcToken }
	| { SplDevnet: SplToken }
	| { SplMainnet: SplToken }
	| { Erc1155: ErcToken };
export type TokenAccountId =
	| { Btc: BtcAddress }
	| { Eth: EthAddress }
	| { Sol: string }
	| { Icrcv2: Icrcv2AccountId };
export type TokenSection = { Spam: null } | { Hidden: null };
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
export interface UserAgreement {
	last_accepted_at_ns: [] | [bigint];
	accepted: [] | [boolean];
	last_updated_at_ms: [] | [bigint];
}
export interface UserAgreements {
	license_agreement: UserAgreement;
	privacy_policy: UserAgreement;
	terms_of_use: UserAgreement;
}
export interface UserCredential {
	issuer: string;
	verified_date_timestamp: [] | [bigint];
	credential_type: CredentialType;
}
export interface UserProfile {
	agreements: [] | [Agreements];
	credentials: Array<UserCredential>;
	version: [] | [bigint];
	settings: [] | [Settings];
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
	add_user_credential: ActorMethod<[AddUserCredentialRequest], AddUserCredentialResult>;
	add_user_hidden_dapp_id: ActorMethod<[AddHiddenDappIdRequest], AddUserHiddenDappIdResult>;
	allow_signing: ActorMethod<[[] | [AllowSigningRequest]], AllowSigningResult>;
	btc_add_pending_transaction: ActorMethod<
		[BtcAddPendingTransactionRequest],
		BtcAddPendingTransactionResult
	>;
	btc_get_current_fee_percentiles: ActorMethod<
		[BtcGetFeePercentilesRequest],
		BtcGetFeePercentilesResult
	>;
	btc_get_pending_transactions: ActorMethod<
		[BtcGetPendingTransactionsRequest],
		BtcGetPendingTransactionsResult
	>;
	btc_select_user_utxos_fee: ActorMethod<[SelectedUtxosFeeRequest], BtcSelectUserUtxosFeeResult>;
	config: ActorMethod<[], Config>;
	create_contact: ActorMethod<[CreateContactRequest], CreateContactResult>;
	create_pow_challenge: ActorMethod<[], CreatePowChallengeResult>;
	create_user_profile: ActorMethod<[], UserProfile>;
	delete_contact: ActorMethod<[bigint], DeleteContactResult>;
	get_account_creation_timestamps: ActorMethod<[], Array<[Principal, bigint]>>;
	get_allowed_cycles: ActorMethod<[], GetAllowedCyclesResult>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	get_contact: ActorMethod<[bigint], GetContactResult>;
	get_contacts: ActorMethod<[], GetContactsResult>;
	get_user_profile: ActorMethod<[], GetUserProfileResult>;
	has_user_profile: ActorMethod<[], HasUserProfileResponse>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	list_custom_tokens: ActorMethod<[], Array<CustomToken>>;
	list_user_tokens: ActorMethod<[], Array<UserToken>>;
	remove_custom_token: ActorMethod<[CustomToken], undefined>;
	remove_user_token: ActorMethod<[UserTokenId], undefined>;
	set_custom_token: ActorMethod<[CustomToken], undefined>;
	set_many_custom_tokens: ActorMethod<[Array<CustomToken>], undefined>;
	set_many_user_tokens: ActorMethod<[Array<UserToken>], undefined>;
	set_user_show_testnets: ActorMethod<[SetShowTestnetsRequest], SetUserShowTestnetsResult>;
	set_user_token: ActorMethod<[UserToken], undefined>;
	stats: ActorMethod<[], Stats>;
	top_up_cycles_ledger: ActorMethod<[[] | [TopUpCyclesLedgerRequest]], TopUpCyclesLedgerResult>;
	update_contact: ActorMethod<[Contact], GetContactResult>;
	update_user_agreements: ActorMethod<[SaveAgreementsRequest], SetUserShowTestnetsResult>;
	update_user_network_settings: ActorMethod<
		[SaveNetworksSettingsRequest],
		SetUserShowTestnetsResult
	>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
