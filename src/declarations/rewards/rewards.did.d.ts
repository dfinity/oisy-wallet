import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
}
export type AccountId_Any = string;
export type AccountSnapshotFor =
	| { Any: AccountSnapshot_Any }
	| { Icrc: AccountSnapshot_Icrc }
	| { SplDevnet: AccountSnapshot_Spl }
	| { SplMainnet: AccountSnapshot_Spl };
export interface AccountSnapshot_Any {
	decimals: number;
	token_address: AnyToken;
	network: AnyNetwork;
	approx_usd_per_token: number;
	last_transactions: Array<Transaction_Any>;
	account: AccountId_Any;
	timestamp: bigint;
	amount: bigint;
}
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
export interface AnyNetwork {
	testnet_for: [] | [string];
	network_id: string;
}
export interface AnyToken {
	token_symbol: string;
	wraps: [] | [string];
}
export interface AwardFilter {
	award_name: [] | [string];
	campaign_id: [] | [string];
}
export interface CampaignEligibility {
	probability_multiplier_enabled: boolean;
	probability_multiplier: number;
	available: boolean;
	eligible: boolean;
	criteria: Array<CriterionEligibility>;
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
export interface ClaimedVipReward {
	campaign_id: string;
}
export interface Config {
	usage_awards_config: [] | [UsageAwardConfig];
	vip_config: [] | [VipConfig];
	vip_campaigns: [] | [Array<[string, VipConfig]>];
	readonly_admins: Array<Principal>;
	oisy_canister: [] | [Principal];
	s1e4_referral_config: [] | [S1E4ReferralConfig];
}
export type Criterion =
	| {
			MinTransactions: { duration: CandidDuration; count: number };
	  }
	| { MinReferrals: { count: number } }
	| {
			MinTransactionsInNetwork: {
				duration: CandidDuration;
				count: number;
			};
	  }
	| {
			MinLogins: {
				duration: CandidDuration;
				count: number;
				session_duration: [] | [CandidDuration];
			};
	  }
	| { MinTotalAssetsUsd: { usd: number } }
	| { MinTotalAssetsUsdInNetwork: { usd: number } }
	| {
			Hangover: {
				duration: CandidDuration;
				inhibitors: [] | [Array<AwardFilter>];
			};
	  }
	| { MinTokens: { count: number } }
	| { EligibleForUsageAward: null };
export interface CriterionEligibility {
	satisfied: boolean;
	criterion: Criterion;
}
export type CriterionName =
	| { MinTransactions: null }
	| { MinReferrals: null }
	| { MinTransactionsInNetwork: null }
	| { MinLogins: null }
	| { MinTotalAssetsUsd: null }
	| { MinTotalAssetsUsdInNetwork: null }
	| { Hangover: null }
	| { MinTokens: null }
	| { EligibleForUsageAward: null };
export type EligibilityError = { NotAuthorized: null };
export interface EligibilityReport {
	campaigns: Array<[string, CampaignEligibility]>;
}
export type EligibilityResponse = { Ok: EligibilityReport } | { Err: EligibilityError };
export interface HoldingsPopcontestRequest {
	to: [] | [number];
	from: [] | [number];
}
export interface HoldingsPopcontestResponse {
	to: [] | [number];
	from: [] | [number];
	entries: Array<UserSnapshot>;
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
	| { UnknownCampaign: null }
	| { VipReward: VipReward };
export type PublicAirdropStatus =
	| {
			Ongoing: { remaining_airdrops: bigint; total_airdrops: bigint };
	  }
	| { Completed: { total_airdrops: bigint } }
	| { Upcoming: null };
export interface PublicSprinkleInfo {
	timestamp_ns: bigint;
	total_amount: bigint;
	n_sprinkled_users: bigint;
	ledger: Principal;
}
export interface RefereeConfig {
	referees_per_referrer: number;
	awards: Array<TokenConfig>;
	criteria: Array<Criterion>;
}
export interface ReferrerConfig {
	referrers_per_event: number;
	awards: Array<TokenConfig>;
	criteria: Array<Criterion>;
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
	campaign_id: string;
	campaign_name: [] | [string];
}
export interface S1E4ReferralConfig {
	referrer: ReferrerConfig;
	cycle_duration: CandidDuration;
	events_per_cycle: number;
	campaign_id: string;
	referee: RefereeConfig;
}
export interface S1E4ReferrerInfo {
	unrewarded_referees: Array<Principal>;
	referrals_count: number;
}
export type SetReferrerError =
	| { SelfReferral: null }
	| { AlreadyHasReferrer: null }
	| { UnknownReferrer: null }
	| { NotNewUser: null }
	| { AnonymousCaller: null };
export type SetReferrerResponse = { Ok: null } | { Err: SetReferrerError };
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
export type StatsKeyType = { TokenGroup: null } | { Network: null } | { TokenSymbol: null };
export interface StatsRequest {
	by: StatsKeyType;
}
export interface StatsResponse {
	request: StatsRequest;
	stats: Array<[string, StatsValue]>;
}
export interface StatsValue {
	user_count: bigint;
	assets_usd: number;
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
export interface Transaction_Any {
	transaction_type: TransactionType;
	network: AnyNetwork;
	counterparty: AccountId_Any;
	timestamp: bigint;
	amount: bigint;
}
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
	first_activity_ns: [] | [bigint];
	approx_usd_valuation: number;
	last_activity_ns: [] | [bigint];
}
export interface UsageAwardConfig {
	cycle_duration: CandidDuration;
	probability_multiplier_rules: Array<[number, Array<CriterionName>]>;
	awards: Array<UsageAwardEvent>;
	eligibility_criteria: UsageCriteria;
	campaign_name: [] | [string];
}
export interface UsageAwardEvent {
	name: string;
	num_events_per_cycle: number;
	awards: Array<TokenConfig>;
	num_users_per_event: number;
	campaign_name: [] | [string];
}
export interface UsageAwardState {
	first_activity_ns: [] | [bigint];
	snapshot_timestamps: BigUint64Array | bigint[];
	snapshots: Array<UserSnapshot>;
	referred_by: [] | [number];
	last_activity_ns: [] | [bigint];
	referrer_info: [] | [ReferrerInfo];
	s1e4_referrer_info: [] | [S1E4ReferrerInfo];
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
	criteria: Array<Criterion>;
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
	superpowers: [] | [Array<string>];
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
	claim_vip_reward: ActorMethod<[VipReward], [ClaimVipRewardResponse, [] | [ClaimedVipReward]]>;
	config: ActorMethod<[], Config>;
	configure_referral: ActorMethod<[S1E4ReferralConfig], undefined>;
	configure_usage_awards: ActorMethod<[UsageAwardConfig], undefined>;
	configure_vip: ActorMethod<[VipConfig], undefined>;
	configure_vips: ActorMethod<[Array<[string, VipConfig]>], undefined>;
	eligible: ActorMethod<[[] | [Principal]], EligibilityResponse>;
	grant_usage_award: ActorMethod<[UsageAwardEvent, [] | [Principal]], undefined>;
	holdings_popcontest: ActorMethod<[HoldingsPopcontestRequest], HoldingsPopcontestResponse>;
	last_activity_histogram: ActorMethod<
		[LastActivityHistogramRequest],
		LastActivityHistogramResponse
	>;
	new_vip_reward: ActorMethod<[[] | [ClaimedVipReward]], NewVipRewardResponse>;
	referrer_info: ActorMethod<[], ReferrerInfo>;
	referrer_info_for: ActorMethod<[Principal], [] | [ReferrerInfo]>;
	register_airdrop_recipient: ActorMethod<[UserSnapshot], undefined>;
	register_snapshot_for: ActorMethod<[Principal, UserSnapshot], undefined>;
	s1e4_eligible_referrers: ActorMethod<[], Array<[Principal, Array<Principal>]>>;
	set_referrer: ActorMethod<[number], SetReferrerResponse>;
	stats_by: ActorMethod<[StatsKeyType], StatsResponse>;
	stats_usage_vs_holding: ActorMethod<[], UsageVsHoldingStats>;
	trigger_s1e4_referrer_award_event: ActorMethod<[], undefined>;
	trigger_usage_award_event: ActorMethod<[UsageAwardEvent], undefined>;
	usage_stats: ActorMethod<[], UsageAwardStats>;
	usage_winners: ActorMethod<[[] | [UsageWinnersRequest]], UsageWinnersResponse>;
	user_info: ActorMethod<[], UserData>;
	user_info_for: ActorMethod<[Principal], UserData>;
	user_stats: ActorMethod<[Principal], UsageAwardState>;
	vip_stats: ActorMethod<[[] | [string]], VipStats>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
