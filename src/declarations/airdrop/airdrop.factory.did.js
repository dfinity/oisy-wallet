// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const CanisterError = IDL.Variant({
		NoChildrenForCode: IDL.Null,
		CannotRegisterMultipleTimes: IDL.Null,
		CanisterKilled: IDL.Null,
		GeneralError: IDL.Text,
		Unauthorized: IDL.Text,
		MaximumDepthReached: IDL.Null,
		CodeAlreadyRedeemed: IDL.Null,
		CodeNotFound: IDL.Null,
		NoCodeForII: IDL.Null
	});
	const Result = IDL.Variant({ Ok: IDL.Null, Err: CanisterError });
	const CodeInfo = IDL.Record({
		codes_generated: IDL.Nat64,
		code: IDL.Text,
		codes_redeemed: IDL.Nat64
	});
	const Result_1 = IDL.Variant({ Ok: CodeInfo, Err: CanisterError });
	const Info = IDL.Record({
		principal: IDL.Principal,
		code: IDL.Text,
		ethereum_address: IDL.Text,
		children: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool)))
	});
	const Result_2 = IDL.Variant({ Ok: Info, Err: CanisterError });
	const Result_3 = IDL.Variant({ Ok: IDL.Nat64, Err: CanisterError });
	return IDL.Service({
		add_admin: IDL.Func([IDL.Text, IDL.Text], [Result], []),
		add_codes: IDL.Func([IDL.Vec(IDL.Text)], [Result], []),
		bring_caninster_back_to_life: IDL.Func([], [Result], []),
		generate_code: IDL.Func([], [Result_1], []),
		get_code: IDL.Func([], [Result_2], ['query']),
		get_total_code_issued: IDL.Func([], [Result_3], ['query']),
		get_total_code_redeemed: IDL.Func([], [Result_3], ['query']),
		is_admin: IDL.Func([], [IDL.Bool], ['query']),
		kill_canister: IDL.Func([], [Result], []),
		redeem_code: IDL.Func([IDL.Text, IDL.Text], [Result_2], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [IDL.Vec(IDL.Text)];
};
