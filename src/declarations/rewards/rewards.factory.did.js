// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const BatchSizes = IDL.Record({
		user_fetching: IDL.Nat16,
		sprinkle: IDL.Nat16,
		block_processing: IDL.Nat16,
		airdrop: IDL.Nat16,
		block_fetching: IDL.Nat16
	});
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const TokenConfig = IDL.Record({
		amount_per_user: IDL.Nat,
		account: Account,
		ledger_canister: IDL.Principal
	});
	const AirDropConfig = IDL.Record({
		number_of_participants: IDL.Nat64,
		start_timestamp_ns: IDL.Nat64,
		token_configs: IDL.Vec(TokenConfig)
	});
	const Config = IDL.Record({
		batch_sizes: IDL.Opt(BatchSizes),
		airdrop_config: IDL.Opt(AirDropConfig),
		index_canisters: IDL.Vec(IDL.Principal),
		processing_interval_s: IDL.Opt(IDL.Nat16),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal)
	});
	const VipReward = IDL.Record({ code: IDL.Text });
	const ClaimVipRewardResponse = IDL.Variant({
		AlreadyClaimed: IDL.Null,
		Success: IDL.Null,
		InvalidCode: IDL.Null
	});
	const NewVipRewardResponse = IDL.Variant({
		NotImportantPerson: IDL.Null,
		VipReward: VipReward
	});
	const PublicAirdropStatus = IDL.Variant({
		Ongoing: IDL.Record({
			remaining_airdrops: IDL.Nat64,
			total_airdrops: IDL.Nat64
		}),
		Completed: IDL.Record({ total_airdrops: IDL.Nat64 }),
		Upcoming: IDL.Null
	});
	const PublicSprinkleInfo = IDL.Record({
		timestamp_ns: IDL.Nat64,
		total_amount: IDL.Nat,
		n_sprinkled_users: IDL.Nat64,
		ledger: IDL.Principal
	});
	const PublicRewardsInfo = IDL.Record({
		airdrop: IDL.Opt(PublicAirdropStatus),
		last_sprinkle: IDL.Opt(PublicSprinkleInfo)
	});
	const LedgerConfig = IDL.Record({
		ledger_index: IDL.Principal,
		ledger: IDL.Principal,
		ledger_account: Account
	});
	const SetSprinkleTimestampArg = IDL.Record({
		total_sprinkle_amount: IDL.Nat,
		min_account_amount: IDL.Nat,
		user_sprinkle_amount: IDL.Nat,
		timestamp: IDL.Nat64,
		ledger_config: LedgerConfig
	});
	const SprinkleEvent = IDL.Record({
		n_sprinkled_users: IDL.Nat64,
		timestamp_scheduled: IDL.Nat64,
		n_eligible_users: IDL.Nat64,
		n_selected_users: IDL.Nat64
	});
	const SprinkleStatus = IDL.Record({
		next_timestamp: IDL.Opt(IDL.Nat64),
		past_events: IDL.Vec(SprinkleEvent)
	});
	const StatusResponse = IDL.Record({
		latest_oisy_user_timestamp: IDL.Opt(IDL.Nat64),
		last_block_fetch_timestamp: IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64)),
		num_buffered_blocks: IDL.Nat64,
		processed_block_height: IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64)),
		sprinkle_status: SprinkleStatus
	});
	const RewardInfo = IDL.Record({
		ledger: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const UserData = IDL.Record({
		airdrops: IDL.Vec(RewardInfo),
		is_vip: IDL.Opt(IDL.Bool),
		sprinkles: IDL.Vec(RewardInfo)
	});
	return IDL.Service({
		claim_vip_reward: IDL.Func([VipReward], [ClaimVipRewardResponse], []),
		config: IDL.Func([], [Config], ['query']),
		new_vip_reward: IDL.Func([], [NewVipRewardResponse], []),
		public_rewards_info: IDL.Func([], [PublicRewardsInfo], ['query']),
		set_sprinkle_timestamp: IDL.Func([SetSprinkleTimestampArg], [], []),
		status: IDL.Func([], [StatusResponse], ['query']),
		user_info: IDL.Func([], [UserData], ['query'])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const BatchSizes = IDL.Record({
		user_fetching: IDL.Nat16,
		sprinkle: IDL.Nat16,
		block_processing: IDL.Nat16,
		airdrop: IDL.Nat16,
		block_fetching: IDL.Nat16
	});
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const TokenConfig = IDL.Record({
		amount_per_user: IDL.Nat,
		account: Account,
		ledger_canister: IDL.Principal
	});
	const AirDropConfig = IDL.Record({
		number_of_participants: IDL.Nat64,
		start_timestamp_ns: IDL.Nat64,
		token_configs: IDL.Vec(TokenConfig)
	});
	const Config = IDL.Record({
		batch_sizes: IDL.Opt(BatchSizes),
		airdrop_config: IDL.Opt(AirDropConfig),
		index_canisters: IDL.Vec(IDL.Principal),
		processing_interval_s: IDL.Opt(IDL.Nat16),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal)
	});
	return [IDL.Opt(Config)];
};
