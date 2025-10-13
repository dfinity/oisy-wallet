import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: [] | [Principal];
	subaccount: [] | [Subaccount];
}
export type Action =
	| {
			ManageNervousSystemParameters: NervousSystemParameters;
	  }
	| { AddGenericNervousSystemFunction: NervousSystemFunction }
	| { RemoveGenericNervousSystemFunction: bigint }
	| { UpgradeSnsToNextVersion: {} }
	| { RegisterDappCanisters: RegisterDappCanisters }
	| { TransferSnsTreasuryFunds: TransferSnsTreasuryFunds }
	| { UpgradeSnsControlledCanister: UpgradeSnsControlledCanister }
	| { DeregisterDappCanisters: DeregisterDappCanisters }
	| { Unspecified: {} }
	| { ManageSnsMetadata: ManageSnsMetadata }
	| {
			ExecuteGenericNervousSystemFunction: ExecuteGenericNervousSystemFunction;
	  }
	| { Motion: Motion };
export interface AddNeuronPermissions {
	permissions_to_add: [] | [NeuronPermissionList];
	principal_id: [] | [Principal];
}
export type AddStakePositionErrors =
	| { TransferError: string }
	| { CapacityExceeded: string }
	| { StakePositionAlreadyExists: string }
	| { AlreadyProcessing: string }
	| { InvalidStakeAmount: string }
	| { InvalidPrincipal: string }
	| { CallError: string }
	| { MaxAllowedStakePositions: string };
export interface Amount {
	e8s: bigint;
}
export interface ArchivedBlocks {
	args: Array<GetBlocksRequest>;
	callback: [Principal, string];
}
export interface Args {
	principal: Principal;
	state: WithdrawState;
}
export interface Args_1 {
	amount: bigint;
}
export interface Args_2 {
	starting_day: bigint;
	limit: [] | [bigint];
}
export interface Args_3 {
	starting_day: bigint;
	limit: [] | [bigint];
}
export interface Args_4 {
	skip: bigint;
	limit: bigint;
	neuron_id: string;
}
export interface Args_5 {
	of_principal: [] | [Principal];
	skip: bigint;
	limit: bigint;
}
export interface Args_6 {
	command: Command;
	neuron_id: Uint8Array | number[];
}
export interface Args_7 {
	dissovle_event_id: number;
	stake_position_user: Principal;
	new_dissolve_timestamp: bigint;
}
export type Args_8 = { Upgrade: UpgradeArgs } | { Init: InitArgs };
export interface BlockWithId {
	id: bigint;
	block: ICRC3Value;
}
export interface BuildVersion {
	major: number;
	minor: number;
	patch: number;
}
export type By = { MemoAndController: MemoAndController } | { NeuronId: {} };
export interface ChangeAutoStakeMaturity {
	requested_setting_for_auto_stake_maturity: boolean;
}
export interface ClaimOrRefresh {
	by: [] | [By];
}
export type ClaimRewardErrors =
	| { NoTokensProvided: string }
	| { TransferError: string }
	| { InvalidRewardToken: string }
	| { AlreadyProcessing: string }
	| { InvalidPrincipal: string }
	| { NotFound: string }
	| { NotAuthorized: string }
	| { CallError: string }
	| { TokenImbalance: string };
export type ClaimRewardStatus = { Failed: string } | { None: null } | { InProgress: null };
export type Command =
	| { Split: Split }
	| { Follow: Follow }
	| { DisburseMaturity: DisburseMaturity }
	| { ClaimOrRefresh: ClaimOrRefresh }
	| { Configure: Configure }
	| { RegisterVote: RegisterVote }
	| { MakeProposal: Proposal }
	| { StakeMaturity: StakeMaturity }
	| { RemoveNeuronPermissions: RemoveNeuronPermissions }
	| { AddNeuronPermissions: AddNeuronPermissions }
	| { MergeMaturity: MergeMaturity }
	| { Disburse: Disburse };
export interface Configure {
	operation: [] | [Operation];
}
export type CreateNeuronError = { TransferError: string } | { InternalError: string };
export interface DailyAnalytics {
	apy: number;
	staked_gldt: bigint;
	rewards: Array<[TokenSymbol, bigint]>;
	weighted_stake: bigint;
}
export interface DefaultFollowees {
	followees: Array<[bigint, Followees]>;
}
export interface DeregisterDappCanisters {
	canister_ids: Array<Principal>;
	new_controllers: Array<Principal>;
}
export interface Disburse {
	to_account: [] | [Account];
	amount: [] | [Amount];
}
export interface DisburseMaturity {
	to_account: [] | [Account];
	percentage_to_disburse: number;
}
export interface DisburseMaturityInProgress {
	timestamp_of_disbursement_seconds: bigint;
	amount_e8s: bigint;
	account_to_disburse_to: [] | [Account];
}
export type DissolveInstantlyRequestErrors =
	| {
			AlreadyWithdrawnEarly: string;
	  }
	| { TransferError: string }
	| { AlreadyProcessing: string }
	| { InvalidPrincipal: string }
	| { NotFound: string }
	| { WithdrawErrors: WithdrawErrors }
	| { NotAuthorized: string }
	| { CallError: string };
export type DissolveInstantlyStatus =
	| { DissolvedInstantly: null }
	| { Failed: string }
	| { None: null }
	| { InProgress: null };
export interface DissolveStakeEvent {
	dissolved_date: bigint;
	completed: boolean;
	amount: bigint;
	percentage: number;
}
export type DissolveState =
	| { DissolveDelaySeconds: bigint }
	| { WhenDissolvedTimestampSeconds: bigint };
export interface Duration {
	secs: bigint;
	nanos: number;
}
export interface ExecuteGenericNervousSystemFunction {
	function_id: bigint;
	payload: Uint8Array | number[];
}
export interface Follow {
	function_id: bigint;
	followees: Array<NeuronId>;
}
export interface Followees {
	followees: Array<NeuronId>;
}
export type FunctionType =
	| { NativeNervousSystemFunction: {} }
	| { GenericNervousSystemFunction: GenericNervousSystemFunction };
export type GeneralError =
	| { TransactionAddError: string }
	| { TransferError: string }
	| { AlreadyProcessing: string }
	| { TransactionPreparationError: string }
	| { CannotAddReward: string }
	| { InvalidPrincipal: string }
	| { BalanceIsLowerThanFee: string }
	| { NotAuthorized: string }
	| { BalanceIsLowerThanThreshold: string }
	| { CallError: string }
	| { ModifyStakeError: string }
	| { StakePositionNotFound: string }
	| { BalanceIsZero: string }
	| { InvalidPercentage: string };
export interface GenericNervousSystemFunction {
	validator_canister_id: [] | [Principal];
	target_canister_id: [] | [Principal];
	validator_method_name: [] | [string];
	target_method_name: [] | [string];
}
export interface GetBlocksRequest {
	start: bigint;
	length: bigint;
}
export interface GetBlocksResult {
	log_length: bigint;
	blocks: Array<BlockWithId>;
	archived_blocks: Array<ArchivedBlocks>;
}
export interface ICRC3ArchiveInfo {
	end: bigint;
	canister_id: Principal;
	start: bigint;
}
export interface ICRC3Config {
	constants: ICRC3Properties;
	supported_blocks: Array<SupportedBlockType>;
}
export interface ICRC3DataCertificate {
	certificate: Uint8Array | number[];
	hash_tree: Uint8Array | number[];
}
export interface ICRC3Properties {
	max_blocks_per_response: bigint;
	initial_cycles: bigint;
	tx_window: Duration;
	max_transactions_to_purge: bigint;
	max_memory_size_bytes: bigint;
	ttl_for_non_archived_transactions: Duration;
	max_transactions_in_window: bigint;
	max_unarchived_transactions: bigint;
	reserved_cycles: bigint;
}
export type ICRC3Value =
	| { Int: bigint }
	| { Map: Array<[string, ICRC3Value]> }
	| { Nat: bigint }
	| { Blob: Uint8Array | number[] }
	| { Text: string }
	| { Array: Array<ICRC3Value> };
export interface IncreaseDissolveDelay {
	additional_dissolve_delay_seconds: number;
}
export interface InitArgs {
	allowed_reward_tokens: Array<string>;
	test_mode: boolean;
	authorized_principals: Array<Principal>;
	version: BuildVersion;
	gld_sns_governance_canister_id: Principal;
	icrc3_config: ICRC3Config;
	gldt_ledger_id: Principal;
	goldao_ledger_id: Principal;
	commit_hash: string;
	gld_sns_rewards_canister_id: Principal;
}
export interface ManageSnsMetadata {
	url: [] | [string];
	logo: [] | [string];
	name: [] | [string];
	description: [] | [string];
}
export type ManageStakePositionArgs =
	| { Withdraw: {} }
	| { DissolveInstantly: { fraction: number } }
	| { StartDissolving: { fraction: number } }
	| { ClaimRewards: { tokens: Array<TokenSymbol> } }
	| { AddStake: { amount: bigint } };
export type ManageStakePositionError =
	| {
			StartDissolvingError: StartDissolvingErrors;
	  }
	| { AddStakeError: AddStakePositionErrors }
	| { GeneralError: GeneralError }
	| { DissolveInstantlyError: DissolveInstantlyRequestErrors }
	| { WithdrawError: WithdrawRequestErrors }
	| { ClaimRewardError: Array<ClaimRewardErrors> };
export interface MemoAndController {
	controller: [] | [Principal];
	memo: bigint;
}
export interface MergeMaturity {
	percentage_to_merge: number;
}
export interface Motion {
	motion_text: string;
}
export interface NervousSystemFunction {
	id: bigint;
	name: string;
	description: [] | [string];
	function_type: [] | [FunctionType];
}
export interface NervousSystemParameters {
	default_followees: [] | [DefaultFollowees];
	max_dissolve_delay_seconds: [] | [bigint];
	max_dissolve_delay_bonus_percentage: [] | [bigint];
	max_followees_per_function: [] | [bigint];
	neuron_claimer_permissions: [] | [NeuronPermissionList];
	neuron_minimum_stake_e8s: [] | [bigint];
	max_neuron_age_for_age_bonus: [] | [bigint];
	initial_voting_period_seconds: [] | [bigint];
	neuron_minimum_dissolve_delay_to_vote_seconds: [] | [bigint];
	reject_cost_e8s: [] | [bigint];
	max_proposals_to_keep_per_action: [] | [number];
	wait_for_quiet_deadline_increase_seconds: [] | [bigint];
	max_number_of_neurons: [] | [bigint];
	transaction_fee_e8s: [] | [bigint];
	max_number_of_proposals_with_ballots: [] | [bigint];
	max_age_bonus_percentage: [] | [bigint];
	neuron_grantable_permissions: [] | [NeuronPermissionList];
	voting_rewards_parameters: [] | [VotingRewardsParameters];
	maturity_modulation_disabled: [] | [boolean];
	max_number_of_principals_per_neuron: [] | [bigint];
}
export interface Neuron {
	id: [] | [NeuronId];
	staked_maturity_e8s_equivalent: [] | [bigint];
	permissions: Array<NeuronPermission>;
	maturity_e8s_equivalent: bigint;
	cached_neuron_stake_e8s: bigint;
	created_timestamp_seconds: bigint;
	source_nns_neuron_id: [] | [bigint];
	auto_stake_maturity: [] | [boolean];
	aging_since_timestamp_seconds: bigint;
	dissolve_state: [] | [DissolveState];
	voting_power_percentage_multiplier: bigint;
	vesting_period_seconds: [] | [bigint];
	disburse_maturity_in_progress: Array<DisburseMaturityInProgress>;
	followees: Array<[bigint, Followees]>;
	neuron_fees_e8s: bigint;
}
export interface NeuronId {
	id: Uint8Array | number[];
}
export interface NeuronPermission {
	principal: [] | [Principal];
	permission_type: Int32Array | number[];
}
export interface NeuronPermissionList {
	permissions: Int32Array | number[];
}
export type NormalWithdrawStatus =
	| { Failed: string }
	| { None: null }
	| { Withdrawn: null }
	| { InProgress: null };
export type Operation =
	| {
			ChangeAutoStakeMaturity: ChangeAutoStakeMaturity;
	  }
	| { StopDissolving: {} }
	| { StartDissolving: {} }
	| { IncreaseDissolveDelay: IncreaseDissolveDelay }
	| { SetDissolveTimestamp: SetDissolveTimestamp };
export interface Proposal {
	url: string;
	title: string;
	action: [] | [Action];
	summary: string;
}
export interface ProposalId {
	id: bigint;
}
export interface RegisterDappCanisters {
	canister_ids: Array<Principal>;
}
export interface RegisterVote {
	vote: number;
	proposal: [] | [ProposalId];
}
export interface RemoveNeuronPermissions {
	permissions_to_remove: [] | [NeuronPermissionList];
	principal_id: [] | [Principal];
}
export type Response = { Success: string } | { InternalError: string };
export type Result = { Ok: null } | { Err: string };
export type Result_1 = { Ok: bigint } | { Err: string };
export type Result_2 = { Ok: Uint8Array | number[] } | { Err: CreateNeuronError };
export type Result_3 = { Ok: StakePositionResponse } | { Err: ManageStakePositionError };
export type Result_4 = { Ok: bigint } | { Err: GeneralError };
export interface SetDissolveTimestamp {
	dissolve_timestamp_seconds: bigint;
}
export interface Split {
	memo: bigint;
	amount_e8s: bigint;
}
export interface StakeMaturity {
	percentage_to_stake: [] | [number];
}
export interface StakePosition {
	staked: bigint;
	dissolve_delay: Duration;
	claimable_rewards: Array<[TokenSymbol, bigint]>;
	claim_reward_status: ClaimRewardStatus;
	age_bonus_timestamp: bigint;
	created_at: bigint;
	owned_by: Principal;
	dissolve_events: Array<DissolveStakeEvent>;
	withdraw_state: WithdrawState;
}
export interface StakePositionResponse {
	staked: bigint;
	dissolve_delay: Duration;
	claimable_rewards: Array<[TokenSymbol, bigint]>;
	created_at: bigint;
	age_bonus_multiplier: number;
	owned_by: Principal;
	dissolve_events: Array<DissolveStakeEvent>;
	weighted_stake: bigint;
	instant_dissolve_fee: bigint;
}
export type StartDissolvingErrors =
	| { DissolvementsLimitReached: string }
	| { AlreadyProcessing: string }
	| { InvalidPrincipal: string }
	| { NotFound: string }
	| { NotAuthorized: string }
	| { InvalidDissolveAmount: string };
export interface StateSnapshot {
	total_staked: bigint;
	position: [] | [StakePosition];
}
export interface Subaccount {
	subaccount: Uint8Array | number[];
}
export interface SupportedBlockType {
	url: string;
	block_type: string;
}
export interface SupportedStandard {
	url: string;
	name: string;
}
export type TokenSymbol =
	| { ICP: null }
	| { OGY: null }
	| { WTN: null }
	| { GOLDAO: null }
	| { GLDT: null };
export interface TransferSnsTreasuryFunds {
	from_treasury: number;
	to_principal: [] | [Principal];
	to_subaccount: [] | [Subaccount];
	memo: [] | [bigint];
	amount_e8s: bigint;
}
export interface UpgradeArgs {
	version: BuildVersion;
	commit_hash: string;
}
export interface UpgradeSnsControlledCanister {
	new_canister_wasm: Uint8Array | number[];
	mode: [] | [number];
	canister_id: [] | [Principal];
	canister_upgrade_arg: [] | [Uint8Array | number[]];
}
export type VoteType = { SelfVote: null } | { FolloweeVote: null };
export interface VotingRewardsParameters {
	final_reward_rate_basis_points: [] | [bigint];
	initial_reward_rate_basis_points: [] | [bigint];
	reward_rate_transition_duration_seconds: [] | [bigint];
	round_duration_seconds: [] | [bigint];
}
export type WithdrawErrors =
	| { NoValidDissolveEvents: string }
	| { AlreadyProcessing: string }
	| { InvalidDissolveInstantlyAmount: string }
	| { InvalidWithdrawAmount: string }
	| { InvalidDissolveState: string }
	| { CantWithdrawWithRewardsBalance: string };
export type WithdrawRequestErrors =
	| { TransferError: string }
	| { AlreadyWithdrawn: string }
	| { InvalidPrincipal: string }
	| { NotFound: string }
	| { WithdrawErrors: WithdrawErrors }
	| { NotAuthorized: string }
	| { CallError: string }
	| { InvalidState: string };
export type WithdrawState =
	| { None: null }
	| { NormalWithdraw: NormalWithdrawStatus }
	| { EarlyWithdraw: DissolveInstantlyStatus };
export interface icrc21_consent_info {
	metadata: icrc21_consent_message_metadata;
	consent_message: icrc21_consent_message;
}
export interface icrc21_consent_message {
	generic_display_message: string;
	fields_display_message: icrc21_field_display_message;
}
export interface icrc21_consent_message_metadata {
	utc_offset_minutes: [] | [number];
	language: string;
}
export interface icrc21_consent_message_request {
	arg: Uint8Array | number[];
	method: string;
	user_preferences: icrc21_consent_message_spec;
}
export type icrc21_consent_message_response = { Ok: icrc21_consent_info } | { Err: icrc21_error };
export interface icrc21_consent_message_spec {
	metadata: icrc21_consent_message_metadata;
	device_spec: [] | [icrc21_device_spec];
}
export type icrc21_device_spec = { GenericDisplay: null } | { FieldsDisplay: null };
export type icrc21_error =
	| { GenericError: icrc21_error_info }
	| { InsufficientPayment: icrc21_generic_error }
	| { UnsupportedCanisterCall: icrc21_error_info }
	| { ConsentMessageUnavailable: icrc21_error_info };
export interface icrc21_error_info {
	description: string;
}
export interface icrc21_field_display_message {
	fields: Array<[string, string]>;
	intent: string;
}
export interface icrc21_generic_error {
	description: string;
	error_code: bigint;
}
export interface _SERVICE {
	_get_state_snapshot: ActorMethod<[null], StateSnapshot>;
	_set_position_withdraw_state: ActorMethod<[Args], Result>;
	_set_token_usd_values: ActorMethod<[Array<[TokenSymbol, number]>], null>;
	allocated_rewards_balance: ActorMethod<[null], Array<[TokenSymbol, Result_1]>>;
	commit: ActorMethod<[], undefined>;
	create_neuron: ActorMethod<[Args_1], Result_2>;
	get_all_gldt_staked_history: ActorMethod<[Args_2], Array<[bigint, bigint]>>;
	get_all_rewards_history: ActorMethod<[Args_2], Array<[bigint, Array<[TokenSymbol, bigint]>]>>;
	get_all_stake_positions: ActorMethod<[], Array<[Principal, StakePosition]>>;
	get_apy_overall: ActorMethod<[null], number>;
	get_apy_timeseries: ActorMethod<[Args_3], Array<[bigint, number]>>;
	get_daily_analytics: ActorMethod<[Args_3], Array<[bigint, DailyAnalytics]>>;
	get_neurons: ActorMethod<[null], Array<Neuron>>;
	get_position: ActorMethod<[], [] | [StakePositionResponse]>;
	get_proposal_votes_of_neuron: ActorMethod<[Args_4], Array<[ProposalId, number, VoteType]>>;
	get_total_allocated_rewards: ActorMethod<[null], Array<[TokenSymbol, bigint]>>;
	get_total_staked: ActorMethod<[null], bigint>;
	icrc10_supported_standards: ActorMethod<[], Array<SupportedStandard>>;
	icrc21_canister_call_consent_message: ActorMethod<
		[icrc21_consent_message_request],
		icrc21_consent_message_response
	>;
	icrc3_get_archives: ActorMethod<[null], Array<ICRC3ArchiveInfo>>;
	icrc3_get_blocks: ActorMethod<[Array<GetBlocksRequest>], GetBlocksResult>;
	icrc3_get_properties: ActorMethod<[null], ICRC3Properties>;
	icrc3_get_tip_certificate: ActorMethod<[null], ICRC3DataCertificate>;
	icrc3_supported_block_types: ActorMethod<[null], Array<SupportedBlockType>>;
	list_all_positions: ActorMethod<[Args_5], Array<StakePositionResponse>>;
	manage_sns_neuron: ActorMethod<[Args_6], Response>;
	manage_stake_position: ActorMethod<[ManageStakePositionArgs], Result_3>;
	manual_allocate_rewards: ActorMethod<[null], null>;
	manual_claim_rewards: ActorMethod<[null], null>;
	manual_sync_neurons: ActorMethod<[null], Result>;
	processing_rewards_balance: ActorMethod<[null], Array<[TokenSymbol, Result_1]>>;
	set_dissolve_event_time: ActorMethod<[Args_7], Result>;
	unallocated_rewards_balance: ActorMethod<[null], Array<[TokenSymbol, Result_4]>>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
