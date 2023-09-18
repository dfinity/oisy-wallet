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
	const Result = IDL.Variant({ Ok: IDL.Text, Err: CanisterError });
	const Info = IDL.Record({
		principal: IDL.Principal,
		code: IDL.Text,
		ethereum_address: IDL.Text,
		children: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool)))
	});
	const Result_1 = IDL.Variant({ Ok: Info, Err: CanisterError });
	return IDL.Service({
		generate_code: IDL.Func([], [Result], []),
		get_code: IDL.Func([], [Result_1], ['query']),
		redeem_code: IDL.Func([IDL.Text, IDL.Text], [Result_1], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [];
};
