// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		chain_id: IDL.Nat
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return IDL.Service({
		caller_eth_address: IDL.Func([], [IDL.Text], []),
		sign_transaction: IDL.Func([], [IDL.Text], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		chain_id: IDL.Nat
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
