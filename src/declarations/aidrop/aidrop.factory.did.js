// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const CanisterError = IDL.Variant({
		NoChildrenForCode: IDL.Null,
		CannotRegisterMultipleTimes: IDL.Null,
		CanisterKilled: IDL.Null,
		GeneralError: IDL.Text,
		Unauthorized: IDL.Null,
		CodeAlreadyRedeemed: IDL.Null,
		CodeNotFound: IDL.Null,
		NoCodeForII: IDL.Null
	});
	const Result = IDL.Variant({
		Ok: IDL.Vec(IDL.Text),
		Err: CanisterError
	});
	const EthAddressAmount = IDL.Record({
		eth_address: IDL.Text,
		amount: IDL.Nat64
	});
	const Result_1 = IDL.Variant({
		Ok: IDL.Vec(EthAddressAmount),
		Err: CanisterError
	});
	const Result_2 = IDL.Variant({ Ok: IDL.Bool, Err: CanisterError });
	const Result_3 = IDL.Variant({ Ok: IDL.Null, Err: CanisterError });
	const RedeemInput = IDL.Record({
		ii: IDL.Text,
		code: IDL.Text,
		eth_address: IDL.Text
	});
	return IDL.Service({
		generate_codes_seed: IDL.Func([IDL.Nat64, IDL.Nat64], [Result], []),
		get_children_codes_for_ii: IDL.Func([IDL.Text], [Result], ['query']),
		get_eth_addresses_and_amounts: IDL.Func([], [Result_1], ['query']),
		has_redeemed: IDL.Func([IDL.Text], [Result_2], ['query']),
		kill_canister: IDL.Func([IDL.Principal], [Result_3], []),
		redeem_code: IDL.Func([RedeemInput], [Result_3], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [];
};
