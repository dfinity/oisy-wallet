import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface Account {
	owner: Principal;
	subaccount: [] | [Uint8Array | number[]];
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
export type ClaimVipRewardResponse =
	| { AlreadyClaimed: null }
	| { Success: null }
	| { InvalidCode: null };
export interface Config {
	batch_sizes: [] | [BatchSizes];
	airdrop_config: [] | [AirDropConfig];
	index_canisters: Array<Principal>;
	processing_interval_s: [] | [number];
	readonly_admins: Array<Principal>;
	oisy_canister: [] | [Principal];
}
export interface LedgerConfig {
	ledger_index: Principal;
	ledger: Principal;
	ledger_account: Account;
}
export type NewVipRewardResponse = { NotImportantPerson: null } | { VipReward: VipReward };
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
export interface RewardInfo {
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
export interface UserData {
	airdrops: Array<RewardInfo>;
	is_vip: [] | [boolean];
	sprinkles: Array<RewardInfo>;
}
export interface VipReward {
	code: string;
}
export interface _SERVICE {
	claim_vip_reward: ActorMethod<[VipReward], ClaimVipRewardResponse>;
	config: ActorMethod<[], Config>;
	new_vip_reward: ActorMethod<[], NewVipRewardResponse>;
	public_rewards_info: ActorMethod<[], PublicRewardsInfo>;
	set_sprinkle_timestamp: ActorMethod<[SetSprinkleTimestampArg], undefined>;
	status: ActorMethod<[], StatusResponse>;
	user_info: ActorMethod<[], UserData>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
