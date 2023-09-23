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
		NoChildrenForCode: IDL.Null,
		CannotRegisterMultipleTimes: IDL.Null,
		CanisterKilled: IDL.Null,
		GeneralError: IDL.Text,
		UnknownOisyWalletAddress: IDL.Null,
		NoMoreCodes: IDL.Null,
		MaximumDepthReached: IDL.Null,
		CodeAlreadyRedeemed: IDL.Null,
		TransactionUnkown: IDL.Null,
		CodeNotFound: IDL.Null,
		DuplicateKey: IDL.Text,
		NoCodeForII: IDL.Null
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
	const Info = IDL.Record({
		principal: IDL.Principal,
		code: IDL.Text,
		ethereum_address: IDL.Text,
		children: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool))),
		tokens_transferred: IDL.Bool
	});
	const Result_3 = IDL.Variant({ Ok: Info, Err: CanisterError });
	return IDL.Service({
		add_admin: IDL.Func([IDL.Principal], [Result], []),
		add_codes: IDL.Func([IDL.Vec(IDL.Text)], [Result], []),
		add_manager: IDL.Func([IDL.Principal], [Result], []),
		bring_caninster_back_to_life: IDL.Func([], [Result], []),
		clean_up: IDL.Func([], [Result], []),
		generate_code: IDL.Func([], [Result_1], []),
		get_airdrop: IDL.Func([IDL.Nat64], [Result_2], []),
		get_code: IDL.Func([], [Result_3], ['query']),
		is_manager: IDL.Func([], [IDL.Bool], ['query']),
		kill_canister: IDL.Func([], [Result], []),
		put_airdrop: IDL.Func([IDL.Vec(IDL.Nat64)], [Result], []),
		redeem_code: IDL.Func([IDL.Text], [Result_3], []),
		remove_admins: IDL.Func([IDL.Vec(IDL.Principal)], [Result], []),
		remove_managers: IDL.Func([IDL.Vec(IDL.Principal)], [Result], [])
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
