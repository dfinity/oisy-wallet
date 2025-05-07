// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const CandidDuration = IDL.Variant({
		Minutes: IDL.Nat64,
		Seconds: IDL.Nat64,
		Days: IDL.Nat64,
		Forever: IDL.Null,
		Hours: IDL.Nat64,
		Nanoseconds: IDL.Nat64
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
	const UsageAwardEvent = IDL.Record({
		name: IDL.Text,
		num_events_per_cycle: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		num_users_per_event: IDL.Nat32,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const Criterion = IDL.Variant({
		MinTransactions: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinReferrals: IDL.Record({ count: IDL.Nat32 }),
		MinLogins: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinTotalAssetsUsd: IDL.Record({ usd: IDL.Nat32 }),
		MinTokens: IDL.Record({ count: IDL.Nat32 })
	});
	const UsageCriteria = IDL.Record({
		measurement_duration: CandidDuration,
		criteria: IDL.Vec(Criterion),
		min_valuation_usd: IDL.Nat64
	});
	const UsageAwardConfig = IDL.Record({
		cycle_duration: CandidDuration,
		awards: IDL.Vec(UsageAwardEvent),
		eligibility_criteria: UsageCriteria,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const AirDropConfig = IDL.Record({
		number_of_participants: IDL.Nat64,
		start_timestamp_ns: IDL.Nat64,
		token_configs: IDL.Vec(TokenConfig)
	});
	const VipConfig = IDL.Record({
		code_validity_duration: IDL.Nat64,
		vips: IDL.Vec(IDL.Principal),
		rewards: IDL.Vec(TokenConfig)
	});
	const Config = IDL.Record({
		usage_awards_config: IDL.Opt(UsageAwardConfig),
		airdrop_config: IDL.Opt(AirDropConfig),
		vip_config: IDL.Opt(VipConfig),
		vip_campaigns: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal)
	});
	const VipReward = IDL.Record({ code: IDL.Text });
	const ClaimVipRewardResponse = IDL.Variant({
		AlreadyClaimed: IDL.Null,
		Success: IDL.Null,
		InvalidCode: IDL.Null
	});
	const ClaimedVipReward = IDL.Record({ campaign_id: IDL.Text });
	const CriterionEligibility = IDL.Record({
		satisfied: IDL.Bool,
		criterion: Criterion
	});
	const CampaignEligibility = IDL.Record({
		available: IDL.Bool,
		eligible: IDL.Bool,
		criteria: IDL.Vec(CriterionEligibility)
	});
	const EligibilityReport = IDL.Record({
		campaigns: IDL.Vec(IDL.Tuple(IDL.Text, CampaignEligibility))
	});
	const EligibilityError = IDL.Variant({ NotAuthorized: IDL.Null });
	const EligibilityResponse = IDL.Variant({
		Ok: EligibilityReport,
		Err: EligibilityError
	});
	const LastActivityHistogramRequest = IDL.Record({
		bucket_count: IDL.Nat32,
		bucket_duration: CandidDuration
	});
	const LastActivityHistogramBucket = IDL.Record({
		start_ns: IDL.Nat64,
		count: IDL.Nat32
	});
	const LastActivityHistogram = IDL.Record({
		older: IDL.Nat32,
		unknown: IDL.Nat32,
		buckets: IDL.Vec(LastActivityHistogramBucket)
	});
	const LastActivityHistogramResponse = IDL.Record({
		request_time: IDL.Nat64,
		request: LastActivityHistogramRequest,
		response: LastActivityHistogram
	});
	const NewVipRewardResponse = IDL.Variant({
		Anonymous: IDL.Null,
		NotImportantPerson: IDL.Null,
		UnknownCampaign: IDL.Null,
		VipReward: VipReward
	});
	const ReferrerInfo = IDL.Record({
		referral_code: IDL.Nat32,
		num_referrals: IDL.Opt(IDL.Nat32)
	});
	const TransactionType = IDL.Variant({
		Send: IDL.Null,
		Receive: IDL.Null
	});
	const Transaction_Icrc = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot_Icrc = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IDL.Principal,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_Icrc),
		account: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const Transaction_Spl = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot_Spl = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IDL.Text,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_Spl),
		account: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshotFor = IDL.Variant({
		Icrc: AccountSnapshot_Icrc,
		SplDevnet: AccountSnapshot_Spl,
		SplMainnet: AccountSnapshot_Spl
	});
	const UserSnapshot = IDL.Record({
		accounts: IDL.Vec(AccountSnapshotFor),
		timestamp: IDL.Opt(IDL.Nat64)
	});
	const SetReferrerError = IDL.Variant({
		SelfReferral: IDL.Null,
		AlreadyHasReferrer: IDL.Null,
		UnknownReferrer: IDL.Null,
		NotNewUser: IDL.Null,
		AnonymousCaller: IDL.Null
	});
	const SetReferrerResponse = IDL.Variant({
		Ok: IDL.Null,
		Err: SetReferrerError
	});
	const UsageAndHolding = IDL.Record({
		first_activity_ns: IDL.Opt(IDL.Nat64),
		approx_usd_valuation: IDL.Float64,
		last_activity_ns: IDL.Opt(IDL.Nat64)
	});
	const UsageVsHoldingStats = IDL.Record({
		holdings: IDL.Vec(UsageAndHolding)
	});
	const UsageAwardStats = IDL.Record({
		user_count: IDL.Nat64,
		eligible_user_count: IDL.Nat64,
		assets_usd: IDL.Float64,
		snapshot_count: IDL.Nat64,
		awarded_count: IDL.Nat64,
		award_events: IDL.Nat64,
		eligible_snapshots: IDL.Nat64
	});
	const UserDbKey = IDL.Record({
		pouh_verified: IDL.Bool,
		oisy_user: IDL.Principal
	});
	const UsageWinnersRequest = IDL.Record({
		to_ns: IDL.Nat64,
		from_ns: IDL.Nat64,
		limit: IDL.Nat32,
		after_user: IDL.Opt(UserDbKey)
	});
	const UsageWinnersResponse = IDL.Record({
		last: IDL.Opt(UserDbKey),
		num_checked: IDL.Nat32,
		winners: IDL.Vec(IDL.Principal)
	});
	const RewardInfo = IDL.Record({
		name: IDL.Opt(IDL.Text),
		ledger: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat,
		campaign_id: IDL.Text,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const UserData = IDL.Record({
		superpowers: IDL.Opt(IDL.Vec(IDL.Text)),
		airdrops: IDL.Vec(RewardInfo),
		usage_awards: IDL.Opt(IDL.Vec(RewardInfo)),
		last_snapshot_timestamp: IDL.Opt(IDL.Nat64),
		is_vip: IDL.Opt(IDL.Bool),
		sprinkles: IDL.Vec(RewardInfo)
	});
	const UsageAwardState = IDL.Record({
		first_activity_ns: IDL.Opt(IDL.Nat64),
		snapshots: IDL.Vec(UserSnapshot),
		referred_by: IDL.Opt(IDL.Nat32),
		last_activity_ns: IDL.Opt(IDL.Nat64),
		referrer_info: IDL.Opt(ReferrerInfo)
	});
	const VipStats = IDL.Record({
		total_rejected: IDL.Nat32,
		total_redeemed: IDL.Nat32,
		total_issued: IDL.Nat32
	});
	return IDL.Service({
		claim_usage_award: IDL.Func([UsageAwardEvent, IDL.Principal], [], []),
		claim_vip_reward: IDL.Func(
			[VipReward],
			[ClaimVipRewardResponse, IDL.Opt(ClaimedVipReward)],
			[]
		),
		config: IDL.Func([], [Config], ['query']),
		configure_usage_awards: IDL.Func([UsageAwardConfig], [], []),
		configure_vip: IDL.Func([VipConfig], [], []),
		configure_vips: IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))], [], []),
		eligible: IDL.Func([IDL.Opt(IDL.Principal)], [EligibilityResponse], ['query']),
		last_activity_histogram: IDL.Func(
			[LastActivityHistogramRequest],
			[LastActivityHistogramResponse],
			['query']
		),
		new_vip_reward: IDL.Func([IDL.Opt(ClaimedVipReward)], [NewVipRewardResponse], []),
		referrer_info: IDL.Func([], [ReferrerInfo], []),
		referrer_info_for: IDL.Func([IDL.Principal], [IDL.Opt(ReferrerInfo)], ['query']),
		register_airdrop_recipient: IDL.Func([UserSnapshot], [], []),
		register_snapshot_for: IDL.Func([IDL.Principal, UserSnapshot], [], []),
		set_referrer: IDL.Func([IDL.Nat32], [SetReferrerResponse], []),
		stats_usage_vs_holding: IDL.Func([], [UsageVsHoldingStats], ['query']),
		trigger_usage_award_event: IDL.Func([UsageAwardEvent], [], []),
		usage_eligible: IDL.Func([IDL.Principal], [IDL.Bool, IDL.Bool], ['query']),
		usage_stats: IDL.Func([], [UsageAwardStats], ['query']),
		usage_winners: IDL.Func([IDL.Opt(UsageWinnersRequest)], [UsageWinnersResponse], ['query']),
		user_info: IDL.Func([], [UserData], ['query']),
		user_info_for: IDL.Func([IDL.Principal], [UserData], ['query']),
		user_stats: IDL.Func([IDL.Principal], [UsageAwardState], ['query']),
		vip_stats: IDL.Func([IDL.Opt(IDL.Text)], [VipStats], ['query'])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const CandidDuration = IDL.Variant({
		Minutes: IDL.Nat64,
		Seconds: IDL.Nat64,
		Days: IDL.Nat64,
		Forever: IDL.Null,
		Hours: IDL.Nat64,
		Nanoseconds: IDL.Nat64
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
	const UsageAwardEvent = IDL.Record({
		name: IDL.Text,
		num_events_per_cycle: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		num_users_per_event: IDL.Nat32,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const Criterion = IDL.Variant({
		MinTransactions: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinReferrals: IDL.Record({ count: IDL.Nat32 }),
		MinLogins: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinTotalAssetsUsd: IDL.Record({ usd: IDL.Nat32 }),
		MinTokens: IDL.Record({ count: IDL.Nat32 })
	});
	const UsageCriteria = IDL.Record({
		measurement_duration: CandidDuration,
		criteria: IDL.Vec(Criterion),
		min_valuation_usd: IDL.Nat64
	});
	const UsageAwardConfig = IDL.Record({
		cycle_duration: CandidDuration,
		awards: IDL.Vec(UsageAwardEvent),
		eligibility_criteria: UsageCriteria,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const AirDropConfig = IDL.Record({
		number_of_participants: IDL.Nat64,
		start_timestamp_ns: IDL.Nat64,
		token_configs: IDL.Vec(TokenConfig)
	});
	const VipConfig = IDL.Record({
		code_validity_duration: IDL.Nat64,
		vips: IDL.Vec(IDL.Principal),
		rewards: IDL.Vec(TokenConfig)
	});
	const Config = IDL.Record({
		usage_awards_config: IDL.Opt(UsageAwardConfig),
		airdrop_config: IDL.Opt(AirDropConfig),
		vip_config: IDL.Opt(VipConfig),
		vip_campaigns: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal)
	});
	return [IDL.Opt(Config)];
};
