// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const CanisterError = IDL.Variant({
		NoChildrenForCode: IDL.Null,
		CannotRegisterMultipleTimes: IDL.Null,
		CanisterKilled: IDL.Null,
		GeneralError: IDL.Text,
		Unauthorized: IDL.Text,
		CodeAlreadyRedeemed: IDL.Null,
		CodeNotFound: IDL.Null,
		NoCodeForII: IDL.Null
	});
	const Result = IDL.Variant({ Ok: IDL.Null, Err: CanisterError });
	const Result_1 = IDL.Variant({ Ok: IDL.Text, Err: CanisterError });
	const Info = IDL.Record({
		principal: IDL.Principal,
		code: IDL.Text,
		ethereum_address: IDL.Text,
		children: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool)))
	});
	const Result_2 = IDL.Variant({ Ok: Info, Err: CanisterError });
	return IDL.Service({
		bring_caninster_back_to_life: IDL.Func([], [Result], []),
		generate_code: IDL.Func([], [Result_1], []),
		get_code: IDL.Func([], [Result_2], ['query']),
		kill_canister: IDL.Func([], [Result], []),
		redeem_code: IDL.Func([IDL.Text, IDL.Text], [Result_2], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [];
};
