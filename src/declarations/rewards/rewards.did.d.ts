import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
}
export type AccountSnapshotFor =
	| { Icrc: AccountSnapshot_Icrc }
	| { SplDevnet: AccountSnapshot_Spl }
	| { SplMainnet: AccountSnapshot_Spl };
export interface AccountSnapshot_Icrc {
	decimals: number;
	token_address: Principal;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_Icrc>;
	account: Principal;
	timestamp: bigint;
	amount: bigint;
}
export interface AccountSnapshot_Spl {
	decimals: number;
	token_address: string;
	network: {};
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_Spl>;
	account: string;
	timestamp: bigint;
	amount: bigint;
}
export interface AirDropConfig {
	number_of_participants: bigint;
	start_timestamp_ns: bigint;
	token_configs: Array<TokenConfig>;
}
export interface BatchSizes {
	user_fetching: number;
	sprinkle: number;
	block_processing: number;
	airdrop: number;
	block_fetching: number;
}
export type CandidDuration =
	| { Minutes: bigint }
	| { Seconds: bigint }
	| { Days: bigint }
	| { Forever: null }
	| { Hours: bigint }
	| { Nanoseconds: bigint };
export type ClaimVipRewardResponse =
	| { AlreadyClaimed: null }
	| { Success: null }
	| { InvalidCode: null };
export interface Config {
	usage_awards_config: [] | [UsageAwardConfig];
	batch_sizes: [] | [BatchSizes];
	airdrop_config: [] | [AirDropConfig];
	index_canisters: Array<Principal>;
	vip_config: [] | [VipConfig];
	processing_interval_s: [] | [number];
	readonly_admins: Array<Principal>;
	oisy_canister: [] | [Principal];
}
export interface LastActivityHistogram {
	older: number;
	unknown: number;
	buckets: Array<LastActivityHistogramBucket>;
}
export interface LastActivityHistogramBucket {
	start_ns: bigint;
	count: number;
}
export interface LastActivityHistogramRequest {
	bucket_count: number;
	bucket_duration: CandidDuration;
}
export interface LastActivityHistogramResponse {
	request_time: bigint;
	request: LastActivityHistogramRequest;
	response: LastActivityHistogram;
}
export interface LedgerConfig {
	ledger_index: Principal;
	ledger: Principal;
	ledger_account: Account;
}
export type NewVipRewardResponse =
	| { Anonymous: null }
	| { NotImportantPerson: null }
	| { VipReward: VipReward };
export type PublicAirdropStatus =
	| {
			Ongoing: { remaining_airdrops: bigint; total_airdrops: bigint };
	  }
	| { Completed: { total_airdrops: bigint } }
	| { Upcoming: null };
export interface PublicRewardsInfo {
	airdrop: [] | [PublicAirdropStatus];
	last_sprinkle: [] | [PublicSprinkleInfo];
}
export interface PublicSprinkleInfo {
	timestamp_ns: bigint;
	total_amount: bigint;
	n_sprinkled_users: bigint;
	ledger: Principal;
}
export interface ReferrerInfo {
	referral_code: number;
	num_referrals: [] | [number];
}
export interface RewardInfo {
	name: [] | [string];
	ledger: Principal;
	timestamp: bigint;
	amount: bigint;
}
export interface SetSprinkleTimestampArg {
	total_sprinkle_amount: bigint;
	min_account_amount: bigint;
	user_sprinkle_amount: bigint;
	timestamp: bigint;
	ledger_config: LedgerConfig;
}
export interface SprinkleEvent {
	n_sprinkled_users: bigint;
	timestamp_scheduled: bigint;
	n_eligible_users: bigint;
	n_selected_users: bigint;
}
export interface SprinkleStatus {
	next_timestamp: [] | [bigint];
	past_events: Array<SprinkleEvent>;
}
export interface StatusResponse {
	latest_oisy_user_timestamp: [] | [bigint];
	last_block_fetch_timestamp: Array<[Principal, bigint]>;
	num_buffered_blocks: bigint;
	processed_block_height: Array<[Principal, bigint]>;
	sprinkle_status: SprinkleStatus;
}
export interface TokenConfig {
	amount_per_user: bigint;
	account: Account;
	ledger_canister: Principal;
}
export type TransactionType = { Send: null } | { Receive: null };
export interface Transaction_Icrc {
	transaction_type: TransactionType;
	network: {};
	counterparty: Principal;
	timestamp: bigint;
	amount: bigint;
}
export interface Transaction_Spl {
	transaction_type: TransactionType;
	network: {};
	counterparty: string;
	timestamp: bigint;
	amount: bigint;
}
export interface UsageAndHolding {
	approx_usd_valuation: number;
	last_activity_ns: [] | [bigint];
}
export interface UsageAwardConfig {
	cycle_duration: CandidDuration;
	awards: Array<UsageAwardEvent>;
	eligibility_criteria: UsageCriteria;
}
export interface UsageAwardEvent {
	name: string;
	num_events_per_cycle: number;
	awards: Array<TokenConfig>;
	num_users_per_event: number;
}
export interface UsageAwardState {
	snapshots: Array<UserSnapshot>;
	referred_by: [] | [number];
	referrer_info: [] | [ReferrerInfo];
}
export interface UsageAwardStats {
	user_count: bigint;
	eligible_user_count: bigint;
	assets_usd: number;
	snapshot_count: bigint;
	awarded_count: bigint;
	award_events: bigint;
	eligible_snapshots: bigint;
}
export interface UsageCriteria {
	measurement_duration: CandidDuration;
	min_transactions: number;
	min_logins: number;
	min_valuation_usd: bigint;
}
export interface UsageVsHoldingStats {
	holdings: Array<UsageAndHolding>;
}
export interface UsageWinnersRequest {
	to_ns: bigint;
	from_ns: bigint;
	limit: number;
	after_user: [] | [UserDbKey];
}
export interface UsageWinnersResponse {
	last: [] | [UserDbKey];
	num_checked: number;
	winners: Array<Principal>;
}
export interface UserData {
	airdrops: Array<RewardInfo>;
	usage_awards: [] | [Array<RewardInfo>];
	last_snapshot_timestamp: [] | [bigint];
	is_vip: [] | [boolean];
	sprinkles: Array<RewardInfo>;
}
export interface UserDbKey {
	pouh_verified: boolean;
	oisy_user: Principal;
}
export interface UserSnapshot {
	accounts: Array<AccountSnapshotFor>;
	timestamp: [] | [bigint];
}
export interface VipConfig {
	code_validity_duration: bigint;
	vips: Array<Principal>;
	rewards: Array<TokenConfig>;
}
export interface VipReward {
	code: string;
}
export interface VipStats {
	total_rejected: number;
	total_redeemed: number;
	total_issued: number;
}
export interface _SERVICE {
	claim_usage_award: ActorMethod<[UsageAwardEvent, Principal], undefined>;
	claim_vip_reward: ActorMethod<[VipReward], ClaimVipRewardResponse>;
	config: ActorMethod<[], Config>;
	configure_usage_awards: ActorMethod<[UsageAwardConfig], undefined>;
	configure_vip: ActorMethod<[VipConfig], undefined>;
	last_activity_histogram: ActorMethod<
		[LastActivityHistogramRequest],
		LastActivityHistogramResponse
	>;
	new_vip_reward: ActorMethod<[], NewVipRewardResponse>;
	public_rewards_info: ActorMethod<[], PublicRewardsInfo>;
	referrer_info: ActorMethod<[], ReferrerInfo>;
	referrer_info_for: ActorMethod<[Principal], [] | [ReferrerInfo]>;
	register_airdrop_recipient: ActorMethod<[UserSnapshot], undefined>;
	register_snapshot_for: ActorMethod<[Principal, UserSnapshot], undefined>;
	set_referrer: ActorMethod<[number], undefined>;
	stats_usage_vs_holding: ActorMethod<[], UsageVsHoldingStats>;
	status: ActorMethod<[], StatusResponse>;
	trigger_usage_award_event: ActorMethod<[UsageAwardEvent], undefined>;
	usage_eligible: ActorMethod<[Principal], [boolean, boolean]>;
	usage_stats: ActorMethod<[], UsageAwardStats>;
	usage_winners: ActorMethod<[[] | [UsageWinnersRequest]], UsageWinnersResponse>;
	user_info: ActorMethod<[], UserData>;
	user_info_for: ActorMethod<[Principal], UserData>;
	user_stats: ActorMethod<[Principal], UsageAwardState>;
	vip_stats: ActorMethod<[], VipStats>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
