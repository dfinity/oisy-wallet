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
	const CriterionName = IDL.Variant({
		MinTransactions: IDL.Null,
		MinReferrals: IDL.Null,
		MinTransactionsInNetwork: IDL.Null,
		MinLogins: IDL.Null,
		MinTotalAssetsUsd: IDL.Null,
		MinTotalAssetsUsdInNetwork: IDL.Null,
		Hangover: IDL.Null,
		MinTokens: IDL.Null,
		EligibleForUsageAward: IDL.Null
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
	const AwardFilter = IDL.Record({
		award_name: IDL.Opt(IDL.Text),
		campaign_id: IDL.Opt(IDL.Text)
	});
	const Criterion = IDL.Variant({
		MinTransactions: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinReferrals: IDL.Record({ count: IDL.Nat32 }),
		MinTransactionsInNetwork: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinLogins: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32,
			session_duration: IDL.Opt(CandidDuration)
		}),
		MinTotalAssetsUsd: IDL.Record({ usd: IDL.Nat32 }),
		MinTotalAssetsUsdInNetwork: IDL.Record({ usd: IDL.Nat32 }),
		Hangover: IDL.Record({
			duration: CandidDuration,
			inhibitors: IDL.Opt(IDL.Vec(AwardFilter))
		}),
		MinTokens: IDL.Record({ count: IDL.Nat32 }),
		EligibleForUsageAward: IDL.Null
	});
	const UsageCriteria = IDL.Record({ criteria: IDL.Vec(Criterion) });
	const UsageAwardConfig = IDL.Record({
		cycle_duration: CandidDuration,
		probability_multiplier_rules: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Vec(CriterionName)))),
		awards: IDL.Vec(UsageAwardEvent),
		eligibility_criteria: UsageCriteria,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const VipConfig = IDL.Record({
		code_validity_duration: IDL.Nat64,
		vips: IDL.Vec(IDL.Principal),
		rewards: IDL.Vec(TokenConfig)
	});
	const ReferrerConfig = IDL.Record({
		referrers_per_event: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		criteria: IDL.Vec(Criterion)
	});
	const RefereeConfig = IDL.Record({
		referees_per_referrer: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		criteria: IDL.Vec(Criterion)
	});
	const S1E4ReferralConfig = IDL.Record({
		referrer: ReferrerConfig,
		cycle_duration: CandidDuration,
		events_per_cycle: IDL.Nat32,
		campaign_id: IDL.Text,
		referee: RefereeConfig
	});
	const Config = IDL.Record({
		usage_awards_config: IDL.Opt(UsageAwardConfig),
		vip_config: IDL.Opt(VipConfig),
		vip_campaigns: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal),
		s1e4_referral_config: IDL.Opt(S1E4ReferralConfig)
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
		probability_multiplier_enabled: IDL.Opt(IDL.Bool),
		probability_multiplier: IDL.Opt(IDL.Nat32),
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
	const HoldingsPopcontestRequest = IDL.Record({
		to: IDL.Opt(IDL.Nat8),
		from: IDL.Opt(IDL.Nat8)
	});
	const AnyToken = IDL.Record({
		token_symbol: IDL.Text,
		wraps: IDL.Opt(IDL.Text)
	});
	const AnyNetwork = IDL.Record({
		testnet_for: IDL.Opt(IDL.Text),
		network_id: IDL.Text
	});
	const TransactionType = IDL.Variant({
		Send: IDL.Null,
		Receive: IDL.Null
	});
	const AccountId_Any = IDL.Text;
	const Transaction_Any = IDL.Record({
		transaction_type: TransactionType,
		network: AnyNetwork,
		counterparty: AccountId_Any,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const AccountSnapshot_Any = IDL.Record({
		decimals: IDL.Nat8,
		token_address: AnyToken,
		network: AnyNetwork,
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_Any),
		account: AccountId_Any,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const Transaction_Icrc = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const AccountSnapshot_Icrc = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IDL.Principal,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_Icrc),
		account: IDL.Principal,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const Transaction_Spl = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const AccountSnapshot_Spl = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IDL.Text,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_Spl),
		account: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat
	});
	const AccountSnapshotFor = IDL.Variant({
		Any: AccountSnapshot_Any,
		Icrc: AccountSnapshot_Icrc,
		SplDevnet: AccountSnapshot_Spl,
		SplMainnet: AccountSnapshot_Spl
	});
	const UserSnapshot = IDL.Record({
		accounts: IDL.Vec(AccountSnapshotFor),
		timestamp: IDL.Opt(IDL.Nat64)
	});
	const HoldingsPopcontestResponse = IDL.Record({
		to: IDL.Opt(IDL.Nat8),
		from: IDL.Opt(IDL.Nat8),
		entries: IDL.Vec(UserSnapshot)
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
	const StatsKeyType = IDL.Variant({
		TokenGroup: IDL.Null,
		Network: IDL.Null,
		TokenSymbol: IDL.Null
	});
	const StatsRequest = IDL.Record({ by: StatsKeyType });
	const StatsValue = IDL.Record({
		user_count: IDL.Nat64,
		assets_usd: IDL.Float64
	});
	const StatsResponse = IDL.Record({
		request: StatsRequest,
		stats: IDL.Vec(IDL.Tuple(IDL.Text, StatsValue))
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
	const S1E4ReferrerInfo = IDL.Record({
		unrewarded_referees: IDL.Vec(IDL.Principal),
		referrals_count: IDL.Nat32
	});
	const UsageAwardState = IDL.Record({
		first_activity_ns: IDL.Opt(IDL.Nat64),
		snapshot_timestamps: IDL.Vec(IDL.Nat64),
		snapshots: IDL.Vec(UserSnapshot),
		referred_by: IDL.Opt(IDL.Nat32),
		last_activity_ns: IDL.Opt(IDL.Nat64),
		referrer_info: IDL.Opt(ReferrerInfo),
		s1e4_referrer_info: IDL.Opt(S1E4ReferrerInfo)
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
		config: IDL.Func([], [Config]),
		configure_referral: IDL.Func([S1E4ReferralConfig], [], []),
		configure_usage_awards: IDL.Func([UsageAwardConfig], [], []),
		configure_vip: IDL.Func([VipConfig], [], []),
		configure_vips: IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))], [], []),
		eligible: IDL.Func([IDL.Opt(IDL.Principal)], [EligibilityResponse]),
		grant_usage_award: IDL.Func([UsageAwardEvent, IDL.Opt(IDL.Principal)], [], []),
		holdings_popcontest: IDL.Func([HoldingsPopcontestRequest], [HoldingsPopcontestResponse]),
		last_activity_histogram: IDL.Func(
			[LastActivityHistogramRequest],
			[LastActivityHistogramResponse]
		),
		new_vip_reward: IDL.Func([IDL.Opt(ClaimedVipReward)], [NewVipRewardResponse], []),
		referrer_info: IDL.Func([], [ReferrerInfo], []),
		referrer_info_for: IDL.Func([IDL.Principal], [IDL.Opt(ReferrerInfo)]),
		register_airdrop_recipient: IDL.Func([UserSnapshot], [], []),
		register_snapshot_for: IDL.Func([IDL.Principal, UserSnapshot], [], []),
		s1e4_eligible_referrers: IDL.Func(
			[],
			[IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Vec(IDL.Principal)))]
		),
		set_referrer: IDL.Func([IDL.Nat32], [SetReferrerResponse], []),
		stats_by: IDL.Func([StatsKeyType], [StatsResponse]),
		stats_usage_vs_holding: IDL.Func([], [UsageVsHoldingStats]),
		trigger_s1e4_referrer_award_event: IDL.Func([], [], []),
		trigger_usage_award_event: IDL.Func([UsageAwardEvent], [], []),
		usage_stats: IDL.Func([], [UsageAwardStats]),
		usage_winners: IDL.Func([IDL.Opt(UsageWinnersRequest)], [UsageWinnersResponse]),
		user_info: IDL.Func([], [UserData]),
		user_info_for: IDL.Func([IDL.Principal], [UserData]),
		user_stats: IDL.Func([IDL.Principal], [UsageAwardState]),
		vip_stats: IDL.Func([IDL.Opt(IDL.Text)], [VipStats])
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
	const CriterionName = IDL.Variant({
		MinTransactions: IDL.Null,
		MinReferrals: IDL.Null,
		MinTransactionsInNetwork: IDL.Null,
		MinLogins: IDL.Null,
		MinTotalAssetsUsd: IDL.Null,
		MinTotalAssetsUsdInNetwork: IDL.Null,
		Hangover: IDL.Null,
		MinTokens: IDL.Null,
		EligibleForUsageAward: IDL.Null
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
	const AwardFilter = IDL.Record({
		award_name: IDL.Opt(IDL.Text),
		campaign_id: IDL.Opt(IDL.Text)
	});
	const Criterion = IDL.Variant({
		MinTransactions: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinReferrals: IDL.Record({ count: IDL.Nat32 }),
		MinTransactionsInNetwork: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32
		}),
		MinLogins: IDL.Record({
			duration: CandidDuration,
			count: IDL.Nat32,
			session_duration: IDL.Opt(CandidDuration)
		}),
		MinTotalAssetsUsd: IDL.Record({ usd: IDL.Nat32 }),
		MinTotalAssetsUsdInNetwork: IDL.Record({ usd: IDL.Nat32 }),
		Hangover: IDL.Record({
			duration: CandidDuration,
			inhibitors: IDL.Opt(IDL.Vec(AwardFilter))
		}),
		MinTokens: IDL.Record({ count: IDL.Nat32 }),
		EligibleForUsageAward: IDL.Null
	});
	const UsageCriteria = IDL.Record({ criteria: IDL.Vec(Criterion) });
	const UsageAwardConfig = IDL.Record({
		cycle_duration: CandidDuration,
		probability_multiplier_rules: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Vec(CriterionName)))),
		awards: IDL.Vec(UsageAwardEvent),
		eligibility_criteria: UsageCriteria,
		campaign_name: IDL.Opt(IDL.Text)
	});
	const VipConfig = IDL.Record({
		code_validity_duration: IDL.Nat64,
		vips: IDL.Vec(IDL.Principal),
		rewards: IDL.Vec(TokenConfig)
	});
	const ReferrerConfig = IDL.Record({
		referrers_per_event: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		criteria: IDL.Vec(Criterion)
	});
	const RefereeConfig = IDL.Record({
		referees_per_referrer: IDL.Nat32,
		awards: IDL.Vec(TokenConfig),
		criteria: IDL.Vec(Criterion)
	});
	const S1E4ReferralConfig = IDL.Record({
		referrer: ReferrerConfig,
		cycle_duration: CandidDuration,
		events_per_cycle: IDL.Nat32,
		campaign_id: IDL.Text,
		referee: RefereeConfig
	});
	const Config = IDL.Record({
		usage_awards_config: IDL.Opt(UsageAwardConfig),
		vip_config: IDL.Opt(VipConfig),
		vip_campaigns: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, VipConfig))),
		readonly_admins: IDL.Vec(IDL.Principal),
		oisy_canister: IDL.Opt(IDL.Principal),
		s1e4_referral_config: IDL.Opt(S1E4ReferralConfig)
	});
	return [IDL.Opt(Config)];
};
