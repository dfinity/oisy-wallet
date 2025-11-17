// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const GetBlocksResult = IDL.Rec();
	const ICRC3Value = IDL.Rec();
	const BuildVersion = IDL.Record({
		major: IDL.Nat32,
		minor: IDL.Nat32,
		patch: IDL.Nat32
	});
	const UpgradeArgs = IDL.Record({
		version: BuildVersion,
		commit_hash: IDL.Text
	});
	const Duration = IDL.Record({ secs: IDL.Nat64, nanos: IDL.Nat32 });
	const ICRC3Properties = IDL.Record({
		max_blocks_per_response: IDL.Nat,
		initial_cycles: IDL.Nat,
		tx_window: Duration,
		max_transactions_to_purge: IDL.Nat,
		max_memory_size_bytes: IDL.Nat,
		ttl_for_non_archived_transactions: Duration,
		max_transactions_in_window: IDL.Nat,
		max_unarchived_transactions: IDL.Nat,
		reserved_cycles: IDL.Nat
	});
	const SupportedBlockType = IDL.Record({
		url: IDL.Text,
		block_type: IDL.Text
	});
	const ICRC3Config = IDL.Record({
		constants: ICRC3Properties,
		supported_blocks: IDL.Vec(SupportedBlockType)
	});
	const InitArgs = IDL.Record({
		apy_limit: IDL.Opt(IDL.Nat8),
		allowed_reward_tokens: IDL.Vec(IDL.Text),
		test_mode: IDL.Bool,
		authorized_principals: IDL.Vec(IDL.Principal),
		version: BuildVersion,
		gld_sns_governance_canister_id: IDL.Principal,
		icrc3_config: ICRC3Config,
		gldt_ledger_id: IDL.Principal,
		goldao_ledger_id: IDL.Principal,
		commit_hash: IDL.Text,
		gld_sns_rewards_canister_id: IDL.Principal
	});
	const Args_6 = IDL.Variant({ Upgrade: UpgradeArgs, Init: InitArgs });
	const TokenSymbol = IDL.Variant({
		ICP: IDL.Null,
		OGY: IDL.Null,
		WTN: IDL.Null,
		GOLDAO: IDL.Null,
		GLDT: IDL.Null
	});
	const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
	const Args = IDL.Record({ amount: IDL.Nat64 });
	const CreateNeuronError = IDL.Variant({
		TransferError: IDL.Text,
		InternalError: IDL.Text
	});
	const Result_1 = IDL.Variant({
		Ok: IDL.Vec(IDL.Nat8),
		Err: CreateNeuronError
	});
	const Args_1 = IDL.Record({
		starting_day: IDL.Nat64,
		limit: IDL.Opt(IDL.Nat64)
	});
	const ClaimRewardStatus = IDL.Variant({
		Failed: IDL.Text,
		None: IDL.Null,
		InProgress: IDL.Null
	});
	const DissolveStakeEvent = IDL.Record({
		dissolved_date: IDL.Nat64,
		completed: IDL.Bool,
		amount: IDL.Nat,
		percentage: IDL.Nat8
	});
	const NormalWithdrawStatus = IDL.Variant({
		Failed: IDL.Text,
		None: IDL.Null,
		Withdrawn: IDL.Null,
		InProgress: IDL.Null
	});
	const DissolveInstantlyStatus = IDL.Variant({
		DissolvedInstantly: IDL.Null,
		Failed: IDL.Text,
		None: IDL.Null,
		InProgress: IDL.Null
	});
	const WithdrawState = IDL.Variant({
		None: IDL.Null,
		NormalWithdraw: NormalWithdrawStatus,
		EarlyWithdraw: DissolveInstantlyStatus
	});
	const StakePosition = IDL.Record({
		staked: IDL.Nat,
		dissolve_delay: Duration,
		claimable_rewards: IDL.Vec(IDL.Tuple(TokenSymbol, IDL.Nat)),
		claim_reward_status: ClaimRewardStatus,
		age_bonus_timestamp: IDL.Nat64,
		created_at: IDL.Nat64,
		owned_by: IDL.Principal,
		dissolve_events: IDL.Vec(DissolveStakeEvent),
		withdraw_state: WithdrawState
	});
	const Args_2 = IDL.Record({
		starting_day: IDL.Nat64,
		limit: IDL.Opt(IDL.Nat64)
	});
	const Response = IDL.Record({
		reward_tokens: IDL.Vec(IDL.Text),
		max_dissolve_events: IDL.Nat64,
		early_unlock_fee: IDL.Float64,
		unlock_delay: IDL.Nat64,
		stake_limit_max: IDL.Nat64,
		stake_limit_min: IDL.Nat64
	});
	const DailyAnalytics = IDL.Record({
		apy: IDL.Float64,
		staked_gldt: IDL.Nat,
		rewards: IDL.Vec(IDL.Tuple(TokenSymbol, IDL.Nat)),
		weighted_stake: IDL.Nat
	});
	const NeuronId = IDL.Record({ id: IDL.Vec(IDL.Nat8) });
	const NeuronPermission = IDL.Record({
		principal: IDL.Opt(IDL.Principal),
		permission_type: IDL.Vec(IDL.Int32)
	});
	const DissolveState = IDL.Variant({
		DissolveDelaySeconds: IDL.Nat64,
		WhenDissolvedTimestampSeconds: IDL.Nat64
	});
	const Subaccount = IDL.Record({ subaccount: IDL.Vec(IDL.Nat8) });
	const Account = IDL.Record({
		owner: IDL.Opt(IDL.Principal),
		subaccount: IDL.Opt(Subaccount)
	});
	const DisburseMaturityInProgress = IDL.Record({
		timestamp_of_disbursement_seconds: IDL.Nat64,
		amount_e8s: IDL.Nat64,
		account_to_disburse_to: IDL.Opt(Account)
	});
	const Followees = IDL.Record({ followees: IDL.Vec(NeuronId) });
	const Neuron = IDL.Record({
		id: IDL.Opt(NeuronId),
		staked_maturity_e8s_equivalent: IDL.Opt(IDL.Nat64),
		permissions: IDL.Vec(NeuronPermission),
		maturity_e8s_equivalent: IDL.Nat64,
		cached_neuron_stake_e8s: IDL.Nat64,
		created_timestamp_seconds: IDL.Nat64,
		source_nns_neuron_id: IDL.Opt(IDL.Nat64),
		auto_stake_maturity: IDL.Opt(IDL.Bool),
		aging_since_timestamp_seconds: IDL.Nat64,
		dissolve_state: IDL.Opt(DissolveState),
		voting_power_percentage_multiplier: IDL.Nat64,
		vesting_period_seconds: IDL.Opt(IDL.Nat64),
		disburse_maturity_in_progress: IDL.Vec(DisburseMaturityInProgress),
		followees: IDL.Vec(IDL.Tuple(IDL.Nat64, Followees)),
		neuron_fees_e8s: IDL.Nat64
	});
	const StakePositionResponse = IDL.Record({
		staked: IDL.Nat,
		dissolve_delay: Duration,
		claimable_rewards: IDL.Vec(IDL.Tuple(TokenSymbol, IDL.Nat)),
		created_at: IDL.Nat64,
		age_bonus_multiplier: IDL.Float64,
		owned_by: IDL.Principal,
		dissolve_events: IDL.Vec(DissolveStakeEvent),
		weighted_stake: IDL.Nat,
		instant_dissolve_fee: IDL.Nat
	});
	const Args_3 = IDL.Record({
		skip: IDL.Nat64,
		limit: IDL.Nat64,
		neuron_id: IDL.Text
	});
	const ProposalId = IDL.Record({ id: IDL.Nat64 });
	const VoteType = IDL.Variant({
		SelfVote: IDL.Null,
		FolloweeVote: IDL.Null
	});
	const SupportedStandard = IDL.Record({ url: IDL.Text, name: IDL.Text });
	const ConsentMessageMetadata = IDL.Record({
		utc_offset_minutes: IDL.Opt(IDL.Int16),
		language: IDL.Text
	});
	const DisplayMessageType = IDL.Variant({
		GenericDisplay: IDL.Null,
		LineDisplay: IDL.Record({
			characters_per_line: IDL.Nat16,
			lines_per_page: IDL.Nat16
		})
	});
	const ConsentMessageSpec = IDL.Record({
		metadata: ConsentMessageMetadata,
		device_spec: IDL.Opt(DisplayMessageType)
	});
	const ConsentMessageRequest = IDL.Record({
		arg: IDL.Vec(IDL.Nat8),
		method: IDL.Text,
		user_preferences: ConsentMessageSpec
	});
	const LineDisplayPage = IDL.Record({ lines: IDL.Vec(IDL.Text) });
	const ConsentMessage = IDL.Variant({
		LineDisplayMessage: IDL.Record({ pages: IDL.Vec(LineDisplayPage) }),
		GenericDisplayMessage: IDL.Text
	});
	const ConsentInfo = IDL.Record({
		metadata: ConsentMessageMetadata,
		consent_message: ConsentMessage
	});
	const ErrorInfo = IDL.Record({ description: IDL.Text });
	const Icrc21Error = IDL.Variant({
		GenericError: IDL.Record({
			description: IDL.Text,
			error_code: IDL.Nat
		}),
		InsufficientPayment: ErrorInfo,
		UnsupportedCanisterCall: ErrorInfo,
		ConsentMessageUnavailable: ErrorInfo
	});
	const Result_2 = IDL.Variant({ Ok: ConsentInfo, Err: Icrc21Error });
	const ICRC3ArchiveInfo = IDL.Record({
		end: IDL.Nat,
		canister_id: IDL.Principal,
		start: IDL.Nat
	});
	const GetBlocksRequest = IDL.Record({
		start: IDL.Nat,
		length: IDL.Nat
	});
	ICRC3Value.fill(
		IDL.Variant({
			Int: IDL.Int,
			Map: IDL.Vec(IDL.Tuple(IDL.Text, ICRC3Value)),
			Nat: IDL.Nat,
			Blob: IDL.Vec(IDL.Nat8),
			Text: IDL.Text,
			Array: IDL.Vec(ICRC3Value)
		})
	);
	const BlockWithId = IDL.Record({ id: IDL.Nat, block: ICRC3Value });
	const ArchivedBlocks = IDL.Record({
		args: IDL.Vec(GetBlocksRequest),
		callback: IDL.Func([IDL.Vec(GetBlocksRequest)], [GetBlocksResult])
	});
	GetBlocksResult.fill(
		IDL.Record({
			log_length: IDL.Nat,
			blocks: IDL.Vec(BlockWithId),
			archived_blocks: IDL.Vec(ArchivedBlocks)
		})
	);
	const ICRC3DataCertificate = IDL.Record({
		certificate: IDL.Vec(IDL.Nat8),
		hash_tree: IDL.Vec(IDL.Nat8)
	});
	const Args_4 = IDL.Record({
		of_principal: IDL.Opt(IDL.Principal),
		skip: IDL.Nat64,
		limit: IDL.Nat64
	});
	const Split = IDL.Record({ memo: IDL.Nat64, amount_e8s: IDL.Nat64 });
	const Follow = IDL.Record({
		function_id: IDL.Nat64,
		followees: IDL.Vec(NeuronId)
	});
	const DisburseMaturity = IDL.Record({
		to_account: IDL.Opt(Account),
		percentage_to_disburse: IDL.Nat32
	});
	const MemoAndController = IDL.Record({
		controller: IDL.Opt(IDL.Principal),
		memo: IDL.Nat64
	});
	const By = IDL.Variant({
		MemoAndController: MemoAndController,
		NeuronId: IDL.Record({})
	});
	const ClaimOrRefresh = IDL.Record({ by: IDL.Opt(By) });
	const ChangeAutoStakeMaturity = IDL.Record({
		requested_setting_for_auto_stake_maturity: IDL.Bool
	});
	const IncreaseDissolveDelay = IDL.Record({
		additional_dissolve_delay_seconds: IDL.Nat32
	});
	const SetDissolveTimestamp = IDL.Record({
		dissolve_timestamp_seconds: IDL.Nat64
	});
	const Operation = IDL.Variant({
		ChangeAutoStakeMaturity: ChangeAutoStakeMaturity,
		StopDissolving: IDL.Record({}),
		StartDissolving: IDL.Record({}),
		IncreaseDissolveDelay: IncreaseDissolveDelay,
		SetDissolveTimestamp: SetDissolveTimestamp
	});
	const Configure = IDL.Record({ operation: IDL.Opt(Operation) });
	const RegisterVote = IDL.Record({
		vote: IDL.Int32,
		proposal: IDL.Opt(ProposalId)
	});
	const DefaultFollowees = IDL.Record({
		followees: IDL.Vec(IDL.Tuple(IDL.Nat64, Followees))
	});
	const NeuronPermissionList = IDL.Record({
		permissions: IDL.Vec(IDL.Int32)
	});
	const VotingRewardsParameters = IDL.Record({
		final_reward_rate_basis_points: IDL.Opt(IDL.Nat64),
		initial_reward_rate_basis_points: IDL.Opt(IDL.Nat64),
		reward_rate_transition_duration_seconds: IDL.Opt(IDL.Nat64),
		round_duration_seconds: IDL.Opt(IDL.Nat64)
	});
	const NervousSystemParameters = IDL.Record({
		default_followees: IDL.Opt(DefaultFollowees),
		max_dissolve_delay_seconds: IDL.Opt(IDL.Nat64),
		max_dissolve_delay_bonus_percentage: IDL.Opt(IDL.Nat64),
		max_followees_per_function: IDL.Opt(IDL.Nat64),
		neuron_claimer_permissions: IDL.Opt(NeuronPermissionList),
		neuron_minimum_stake_e8s: IDL.Opt(IDL.Nat64),
		max_neuron_age_for_age_bonus: IDL.Opt(IDL.Nat64),
		initial_voting_period_seconds: IDL.Opt(IDL.Nat64),
		neuron_minimum_dissolve_delay_to_vote_seconds: IDL.Opt(IDL.Nat64),
		reject_cost_e8s: IDL.Opt(IDL.Nat64),
		max_proposals_to_keep_per_action: IDL.Opt(IDL.Nat32),
		wait_for_quiet_deadline_increase_seconds: IDL.Opt(IDL.Nat64),
		max_number_of_neurons: IDL.Opt(IDL.Nat64),
		transaction_fee_e8s: IDL.Opt(IDL.Nat64),
		max_number_of_proposals_with_ballots: IDL.Opt(IDL.Nat64),
		max_age_bonus_percentage: IDL.Opt(IDL.Nat64),
		neuron_grantable_permissions: IDL.Opt(NeuronPermissionList),
		voting_rewards_parameters: IDL.Opt(VotingRewardsParameters),
		maturity_modulation_disabled: IDL.Opt(IDL.Bool),
		max_number_of_principals_per_neuron: IDL.Opt(IDL.Nat64)
	});
	const GenericNervousSystemFunction = IDL.Record({
		validator_canister_id: IDL.Opt(IDL.Principal),
		target_canister_id: IDL.Opt(IDL.Principal),
		validator_method_name: IDL.Opt(IDL.Text),
		target_method_name: IDL.Opt(IDL.Text)
	});
	const FunctionType = IDL.Variant({
		NativeNervousSystemFunction: IDL.Record({}),
		GenericNervousSystemFunction: GenericNervousSystemFunction
	});
	const NervousSystemFunction = IDL.Record({
		id: IDL.Nat64,
		name: IDL.Text,
		description: IDL.Opt(IDL.Text),
		function_type: IDL.Opt(FunctionType)
	});
	const RegisterDappCanisters = IDL.Record({
		canister_ids: IDL.Vec(IDL.Principal)
	});
	const TransferSnsTreasuryFunds = IDL.Record({
		from_treasury: IDL.Int32,
		to_principal: IDL.Opt(IDL.Principal),
		to_subaccount: IDL.Opt(Subaccount),
		memo: IDL.Opt(IDL.Nat64),
		amount_e8s: IDL.Nat64
	});
	const UpgradeSnsControlledCanister = IDL.Record({
		new_canister_wasm: IDL.Vec(IDL.Nat8),
		mode: IDL.Opt(IDL.Int32),
		canister_id: IDL.Opt(IDL.Principal),
		canister_upgrade_arg: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const DeregisterDappCanisters = IDL.Record({
		canister_ids: IDL.Vec(IDL.Principal),
		new_controllers: IDL.Vec(IDL.Principal)
	});
	const ManageSnsMetadata = IDL.Record({
		url: IDL.Opt(IDL.Text),
		logo: IDL.Opt(IDL.Text),
		name: IDL.Opt(IDL.Text),
		description: IDL.Opt(IDL.Text)
	});
	const ExecuteGenericNervousSystemFunction = IDL.Record({
		function_id: IDL.Nat64,
		payload: IDL.Vec(IDL.Nat8)
	});
	const Motion = IDL.Record({ motion_text: IDL.Text });
	const Action = IDL.Variant({
		ManageNervousSystemParameters: NervousSystemParameters,
		AddGenericNervousSystemFunction: NervousSystemFunction,
		RemoveGenericNervousSystemFunction: IDL.Nat64,
		UpgradeSnsToNextVersion: IDL.Record({}),
		RegisterDappCanisters: RegisterDappCanisters,
		TransferSnsTreasuryFunds: TransferSnsTreasuryFunds,
		UpgradeSnsControlledCanister: UpgradeSnsControlledCanister,
		DeregisterDappCanisters: DeregisterDappCanisters,
		Unspecified: IDL.Record({}),
		ManageSnsMetadata: ManageSnsMetadata,
		ExecuteGenericNervousSystemFunction: ExecuteGenericNervousSystemFunction,
		Motion: Motion
	});
	const Proposal = IDL.Record({
		url: IDL.Text,
		title: IDL.Text,
		action: IDL.Opt(Action),
		summary: IDL.Text
	});
	const StakeMaturity = IDL.Record({
		percentage_to_stake: IDL.Opt(IDL.Nat32)
	});
	const RemoveNeuronPermissions = IDL.Record({
		permissions_to_remove: IDL.Opt(NeuronPermissionList),
		principal_id: IDL.Opt(IDL.Principal)
	});
	const AddNeuronPermissions = IDL.Record({
		permissions_to_add: IDL.Opt(NeuronPermissionList),
		principal_id: IDL.Opt(IDL.Principal)
	});
	const MergeMaturity = IDL.Record({ percentage_to_merge: IDL.Nat32 });
	const Amount = IDL.Record({ e8s: IDL.Nat64 });
	const Disburse = IDL.Record({
		to_account: IDL.Opt(Account),
		amount: IDL.Opt(Amount)
	});
	const Command = IDL.Variant({
		Split: Split,
		Follow: Follow,
		DisburseMaturity: DisburseMaturity,
		ClaimOrRefresh: ClaimOrRefresh,
		Configure: Configure,
		RegisterVote: RegisterVote,
		MakeProposal: Proposal,
		StakeMaturity: StakeMaturity,
		RemoveNeuronPermissions: RemoveNeuronPermissions,
		AddNeuronPermissions: AddNeuronPermissions,
		MergeMaturity: MergeMaturity,
		Disburse: Disburse
	});
	const Args_5 = IDL.Record({
		command: Command,
		neuron_id: IDL.Vec(IDL.Nat8)
	});
	const Response_1 = IDL.Variant({
		Success: IDL.Text,
		InternalError: IDL.Text
	});
	const ManageStakePositionArgs = IDL.Variant({
		Withdraw: IDL.Record({}),
		DissolveInstantly: IDL.Record({ fraction: IDL.Nat8 }),
		StartDissolving: IDL.Record({ fraction: IDL.Nat8 }),
		ClaimRewards: IDL.Record({ tokens: IDL.Vec(TokenSymbol) }),
		AddStake: IDL.Record({ amount: IDL.Nat })
	});
	const StartDissolvingErrors = IDL.Variant({
		DissolvementsLimitReached: IDL.Text,
		AlreadyProcessing: IDL.Text,
		InvalidPrincipal: IDL.Text,
		NotFound: IDL.Text,
		NotAuthorized: IDL.Text,
		InvalidDissolveAmount: IDL.Text
	});
	const AddStakePositionErrors = IDL.Variant({
		TransferError: IDL.Text,
		CapacityExceeded: IDL.Text,
		StakePositionAlreadyExists: IDL.Text,
		AlreadyProcessing: IDL.Text,
		InvalidStakeAmount: IDL.Text,
		InvalidPrincipal: IDL.Text,
		CallError: IDL.Text,
		MaxAllowedStakePositions: IDL.Text
	});
	const GeneralError = IDL.Variant({
		TransactionAddError: IDL.Text,
		TransferError: IDL.Text,
		AlreadyProcessing: IDL.Text,
		TransactionPreparationError: IDL.Text,
		CannotAddReward: IDL.Text,
		InvalidPrincipal: IDL.Text,
		BalanceIsLowerThanFee: IDL.Text,
		NotAuthorized: IDL.Text,
		BalanceIsLowerThanThreshold: IDL.Text,
		CallError: IDL.Text,
		ModifyStakeError: IDL.Text,
		StakePositionNotFound: IDL.Text,
		BalanceIsZero: IDL.Text,
		ZeroAPY: IDL.Text,
		InvalidPercentage: IDL.Text
	});
	const WithdrawErrors = IDL.Variant({
		NoValidDissolveEvents: IDL.Text,
		AlreadyProcessing: IDL.Text,
		InvalidDissolveInstantlyAmount: IDL.Text,
		InvalidWithdrawAmount: IDL.Text,
		InvalidDissolveState: IDL.Text,
		CantWithdrawWithRewardsBalance: IDL.Text
	});
	const DissolveInstantlyRequestErrors = IDL.Variant({
		AlreadyWithdrawnEarly: IDL.Text,
		TransferError: IDL.Text,
		AlreadyProcessing: IDL.Text,
		InvalidPrincipal: IDL.Text,
		NotFound: IDL.Text,
		WithdrawErrors: WithdrawErrors,
		NotAuthorized: IDL.Text,
		CallError: IDL.Text
	});
	const WithdrawRequestErrors = IDL.Variant({
		TransferError: IDL.Text,
		AlreadyWithdrawn: IDL.Text,
		InvalidPrincipal: IDL.Text,
		NotFound: IDL.Text,
		WithdrawErrors: WithdrawErrors,
		NotAuthorized: IDL.Text,
		CallError: IDL.Text,
		InvalidState: IDL.Text
	});
	const ClaimRewardErrors = IDL.Variant({
		NoTokensProvided: IDL.Text,
		TransferError: IDL.Text,
		InvalidRewardToken: IDL.Text,
		AlreadyProcessing: IDL.Text,
		InvalidPrincipal: IDL.Text,
		NotFound: IDL.Text,
		NotAuthorized: IDL.Text,
		CallError: IDL.Text,
		TokenImbalance: IDL.Text
	});
	const ManageStakePositionError = IDL.Variant({
		StartDissolvingError: StartDissolvingErrors,
		AddStakeError: AddStakePositionErrors,
		GeneralError: GeneralError,
		DissolveInstantlyError: DissolveInstantlyRequestErrors,
		WithdrawError: WithdrawRequestErrors,
		ClaimRewardError: IDL.Vec(ClaimRewardErrors)
	});
	const Result_3 = IDL.Variant({
		Ok: StakePositionResponse,
		Err: ManageStakePositionError
	});
	const Result_4 = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
	const Result_5 = IDL.Variant({ Ok: IDL.Nat, Err: GeneralError });
	return IDL.Service({
		allocated_rewards_balance: IDL.Func([IDL.Null], [IDL.Vec(IDL.Tuple(TokenSymbol, Result))], []),
		commit: IDL.Func([], [], []),
		create_neuron: IDL.Func([Args], [Result_1], []),
		get_all_gldt_staked_history: IDL.Func([Args_1], [IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Nat))]),
		get_all_rewards_history: IDL.Func(
			[Args_1],
			[IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Vec(IDL.Tuple(TokenSymbol, IDL.Nat))))]
		),
		get_all_stake_positions: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, StakePosition))]),
		get_apy_overall: IDL.Func([IDL.Null], [IDL.Float64]),
		get_apy_timeseries: IDL.Func([Args_2], [IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Float64))]),
		get_config: IDL.Func([IDL.Null], [Response]),
		get_daily_analytics: IDL.Func([Args_2], [IDL.Vec(IDL.Tuple(IDL.Nat64, DailyAnalytics))]),
		get_neurons: IDL.Func([IDL.Null], [IDL.Vec(Neuron)]),
		get_position: IDL.Func([IDL.Principal], [IDL.Opt(StakePositionResponse)]),
		get_proposal_votes_of_neuron: IDL.Func(
			[Args_3],
			[IDL.Vec(IDL.Tuple(ProposalId, IDL.Int32, VoteType))]
		),
		get_total_allocated_rewards: IDL.Func([IDL.Null], [IDL.Vec(IDL.Tuple(TokenSymbol, IDL.Nat))]),
		get_total_staked: IDL.Func([IDL.Null], [IDL.Nat]),
		icrc10_supported_standards: IDL.Func([], [IDL.Vec(SupportedStandard)]),
		icrc21_canister_call_consent_message: IDL.Func([ConsentMessageRequest], [Result_2]),
		icrc3_get_archives: IDL.Func([IDL.Null], [IDL.Vec(ICRC3ArchiveInfo)]),
		icrc3_get_blocks: IDL.Func([IDL.Vec(GetBlocksRequest)], [GetBlocksResult]),
		icrc3_get_properties: IDL.Func([IDL.Null], [ICRC3Properties]),
		icrc3_get_tip_certificate: IDL.Func([IDL.Null], [ICRC3DataCertificate]),
		icrc3_supported_block_types: IDL.Func([IDL.Null], [IDL.Vec(SupportedBlockType)]),
		list_all_positions: IDL.Func([Args_4], [IDL.Vec(StakePositionResponse)]),
		manage_sns_neuron: IDL.Func([Args_5], [Response_1], []),
		manage_stake_position: IDL.Func([ManageStakePositionArgs], [Result_3], []),
		processing_rewards_balance: IDL.Func([IDL.Null], [IDL.Vec(IDL.Tuple(TokenSymbol, Result))], []),
		set_apy_limit: IDL.Func([IDL.Opt(IDL.Nat8)], [Result_4], []),
		unallocated_rewards_balance: IDL.Func(
			[IDL.Null],
			[IDL.Vec(IDL.Tuple(TokenSymbol, Result_5))],
			[]
		)
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const BuildVersion = IDL.Record({
		major: IDL.Nat32,
		minor: IDL.Nat32,
		patch: IDL.Nat32
	});
	const UpgradeArgs = IDL.Record({
		version: BuildVersion,
		commit_hash: IDL.Text
	});
	const Duration = IDL.Record({ secs: IDL.Nat64, nanos: IDL.Nat32 });
	const ICRC3Properties = IDL.Record({
		max_blocks_per_response: IDL.Nat,
		initial_cycles: IDL.Nat,
		tx_window: Duration,
		max_transactions_to_purge: IDL.Nat,
		max_memory_size_bytes: IDL.Nat,
		ttl_for_non_archived_transactions: Duration,
		max_transactions_in_window: IDL.Nat,
		max_unarchived_transactions: IDL.Nat,
		reserved_cycles: IDL.Nat
	});
	const SupportedBlockType = IDL.Record({
		url: IDL.Text,
		block_type: IDL.Text
	});
	const ICRC3Config = IDL.Record({
		constants: ICRC3Properties,
		supported_blocks: IDL.Vec(SupportedBlockType)
	});
	const InitArgs = IDL.Record({
		apy_limit: IDL.Opt(IDL.Nat8),
		allowed_reward_tokens: IDL.Vec(IDL.Text),
		test_mode: IDL.Bool,
		authorized_principals: IDL.Vec(IDL.Principal),
		version: BuildVersion,
		gld_sns_governance_canister_id: IDL.Principal,
		icrc3_config: ICRC3Config,
		gldt_ledger_id: IDL.Principal,
		goldao_ledger_id: IDL.Principal,
		commit_hash: IDL.Text,
		gld_sns_rewards_canister_id: IDL.Principal
	});
	const Args_6 = IDL.Variant({ Upgrade: UpgradeArgs, Init: InitArgs });
	return [Args_6];
};
