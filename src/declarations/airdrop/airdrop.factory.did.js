// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({
		backend_canister_id: IDL.Principal,
		token_per_person: IDL.Nat64,
		maximum_depth: IDL.Nat64,
		total_tokens: IDL.Nat64,
		numbers_of_children: IDL.Nat64
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	const CanisterError = IDL.Variant({
		PrincipalNotParticipatingInAirdrop: IDL.Null,
		NoChildrenForCode: IDL.Null,
		CannotRegisterMultipleTimes: IDL.Null,
		NoTokensLeft: IDL.Null,
		CanisterKilled: IDL.Null,
		GeneralError: IDL.Text,
		UnknownOisyWalletAddress: IDL.Null,
		NoMoreCodes: IDL.Null,
		MaximumDepthReached: IDL.Null,
		CodeAlreadyRedeemed: IDL.Null,
		TransactionUnkown: IDL.Null,
		CodeNotFound: IDL.Null,
		DuplicateKey: IDL.Text,
		NoCodeForII: IDL.Null,
		ManagersCannotParticipateInTheAirdrop: IDL.Null
	});
	const Result = IDL.Variant({ Ok: IDL.Null, Err: CanisterError });
	const CodeInfo = IDL.Record({
		codes_generated: IDL.Nat64,
		code: IDL.Text,
		codes_redeemed: IDL.Nat64
	});
	const Result_1 = IDL.Variant({ Ok: CodeInfo, Err: CanisterError });
	const Result_2 = IDL.Variant({
		Ok: IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Text, IDL.Nat)),
		Err: CanisterError
	});
	const CanisterStatusType = IDL.Variant({
		stopped: IDL.Null,
		stopping: IDL.Null,
		running: IDL.Null
	});
	const DefiniteCanisterSettingsArgs = IDL.Record({
		controller: IDL.Principal,
		freezing_threshold: IDL.Nat,
		controllers: IDL.Vec(IDL.Principal),
		memory_allocation: IDL.Nat,
		compute_allocation: IDL.Nat
	});
	const CanisterStatusResultV2 = IDL.Record({
		controller: IDL.Principal,
		status: CanisterStatusType,
		freezing_threshold: IDL.Nat,
		balance: IDL.Vec(IDL.Tuple(IDL.Vec(IDL.Nat8), IDL.Nat)),
		memory_size: IDL.Nat,
		cycles: IDL.Nat,
		settings: DefiniteCanisterSettingsArgs,
		idle_cycles_burned_per_day: IDL.Nat,
		module_hash: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const Info = IDL.Record({
		principal: IDL.Principal,
		code: IDL.Text,
		ethereum_address: IDL.Text,
		children: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool))),
		tokens_transferred: IDL.Bool
	});
	const Result_3 = IDL.Variant({ Ok: Info, Err: CanisterError });
	const Result_4 = IDL.Variant({
		Ok: IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Text)),
		Err: CanisterError
	});
	const Result_5 = IDL.Variant({
		Ok: IDL.Vec(IDL.Principal),
		Err: CanisterError
	});
	const PrincipalState = IDL.Record({
		codes_generated: IDL.Nat64,
		codes_redeemed: IDL.Nat64
	});
	const Result_6 = IDL.Variant({
		Ok: IDL.Vec(IDL.Tuple(IDL.Principal, PrincipalState)),
		Err: CanisterError
	});
	const Result_7 = IDL.Variant({
		Ok: IDL.Tuple(IDL.Nat64, IDL.Nat64, IDL.Nat64, IDL.Nat64),
		Err: CanisterError
	});
	const RewardType = IDL.Variant({
		Airdrop: IDL.Null,
		Referral: IDL.Null
	});
	const EthereumTransaction = IDL.Record({
		transferred: IDL.Bool,
		reward_type: RewardType,
		eth_address: IDL.Text,
		amount: IDL.Nat64
	});
	const Result_8 = IDL.Variant({
		Ok: IDL.Vec(EthereumTransaction),
		Err: CanisterError
	});
	const Result_9 = IDL.Variant({ Ok: IDL.Text, Err: CanisterError });
	const HttpRequest = IDL.Record({
		url: IDL.Text,
		method: IDL.Text,
		body: IDL.Vec(IDL.Nat8),
		headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))
	});
	const HttpResponse = IDL.Record({
		body: IDL.Vec(IDL.Nat8),
		headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
		status_code: IDL.Nat16
	});
	return IDL.Service({
		add_admin: IDL.Func([IDL.Principal], [Result], []),
		add_codes: IDL.Func([IDL.Vec(IDL.Text)], [Result], []),
		add_manager: IDL.Func([IDL.Principal], [Result], []),
		bring_caninster_back_to_life: IDL.Func([], [Result], []),
		clean_up: IDL.Func([], [Result], []),
		generate_code: IDL.Func([], [Result_1], []),
		get_airdrop: IDL.Func([IDL.Nat64], [Result_2], []),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		get_code: IDL.Func([], [Result_3], ['query']),
		get_logs: IDL.Func([IDL.Nat64], [Result_4], ['query']),
		get_state_admins: IDL.Func([], [Result_5], ['query']),
		get_state_managers: IDL.Func([], [Result_6], ['query']),
		get_state_parameters: IDL.Func([], [Result_7], ['query']),
		get_state_rewards: IDL.Func([], [Result_8], ['query']),
		get_stats: IDL.Func([], [Result_9], ['query']),
		http_request: IDL.Func([HttpRequest], [HttpResponse], ['query']),
		is_manager: IDL.Func([], [IDL.Bool], ['query']),
		kill_canister: IDL.Func([], [Result], []),
		put_airdrop: IDL.Func([IDL.Vec(IDL.Nat64)], [Result], []),
		redeem_code: IDL.Func([IDL.Text], [Result_3], []),
		remove_admins: IDL.Func([IDL.Vec(IDL.Principal)], [Result], []),
		remove_managers: IDL.Func([IDL.Vec(IDL.Principal)], [Result], []),
		remove_principal_airdrop: IDL.Func([IDL.Principal], [Result], []),
		set_total_tokens: IDL.Func([IDL.Nat64], [Result], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({
		backend_canister_id: IDL.Principal,
		token_per_person: IDL.Nat64,
		maximum_depth: IDL.Nat64,
		total_tokens: IDL.Nat64,
		numbers_of_children: IDL.Nat64
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
